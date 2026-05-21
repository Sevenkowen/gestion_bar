import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MenuItemType,
  OrderItemStatus,
  OrderStatus,
  PrintSector,
  TableStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DOMAIN_EVENTS, OrderItemsSentPayload } from '../../common/events/domain.events';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { MenuService } from '../menu/menu.service';

@Injectable()
export class PedidosService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
    private menuService: MenuService,
  ) {}

  async findByTable(tableId: number) {
    return this.prisma.order.findFirst({
      where: {
        tableId,
        status: { in: [OrderStatus.ABIERTO, OrderStatus.ENVIADO, OrderStatus.CUENTA_PEDIDA] },
      },
      include: {
        items: {
          include: { product: true, combo: true, ingredient: true },
          orderBy: { createdAt: 'asc' },
        },
        waiter: { select: { id: true, name: true } },
      },
    });
  }

  async addItem(orderId: number, dto: AddOrderItemDto, branchId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId, status: OrderStatus.ABIERTO },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado o no editable');

    if (!dto.productId && !dto.comboId && !dto.menuItemId) {
      throw new UnprocessableEntityException('Debe indicar ítem de menú, producto o combo');
    }

    let productId = dto.productId;
    let comboId = dto.comboId;
    let ingredientId: number | undefined;
    let menuItemId: number | undefined;
    let unitPrice: Prisma.Decimal;
    let printSector: PrintSector | null = null;

    if (dto.menuItemId) {
      const menuItem = await this.menuService.findMenuItemForOrder(dto.menuItemId, branchId);
      menuItemId = menuItem.id;
      unitPrice = menuItem.price;

      if (menuItem.type === MenuItemType.PRODUCT && menuItem.product) {
        productId = menuItem.product.id;
        printSector = menuItem.product.printSector;
      } else if (menuItem.type === MenuItemType.COMBO && menuItem.combo) {
        comboId = menuItem.combo.id;
      } else if (menuItem.type === MenuItemType.INSUMO && menuItem.ingredient) {
        ingredientId = menuItem.ingredient.id;
        printSector = PrintSector.BARRA;
      } else {
        throw new UnprocessableEntityException('Ítem de menú inválido');
      }
    } else if (productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, branchId, active: true, deletedAt: null },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');
      if (!product.manualAvailable || !product.autoAvailable) {
        throw new UnprocessableEntityException(`${product.name} no está disponible`);
      }
      unitPrice = product.price;
      printSector = product.printSector;
    } else {
      const combo = await this.prisma.combo.findFirst({
        where: { id: comboId!, branchId, active: true, deletedAt: null },
        include: { products: { include: { product: true } } },
      });
      if (!combo) throw new NotFoundException('Combo no encontrado');
      for (const cp of combo.products) {
        const p = cp.product;
        if (!p.manualAvailable || !p.autoAvailable) {
          throw new UnprocessableEntityException(
            `Combo no disponible: falta stock de ${p.name}`,
          );
        }
      }
      unitPrice = combo.price;
    }

    const subtotal = unitPrice.mul(dto.quantity);

    return this.prisma.orderItem.create({
      data: {
        orderId,
        productId: productId ?? null,
        comboId: comboId ?? null,
        ingredientId: ingredientId ?? null,
        menuItemId: menuItemId ?? null,
        quantity: dto.quantity,
        unitPrice,
        subtotal,
        printSector,
        notes: dto.notes,
        status: OrderItemStatus.BORRADOR,
      },
      include: { product: true, combo: true, ingredient: true },
    });
  }

  /** Envía ítems borrador → cocina/barra. Dispara stock + impresión vía eventos. */
  async sendOrder(orderId: number, branchId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId },
      include: {
        items: { where: { status: OrderItemStatus.BORRADOR } },
        waiter: true,
        table: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (!order.items.length) {
      throw new UnprocessableEntityException('No hay ítems para enviar');
    }

    const itemIds = order.items.map((i) => i.id);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { id: { in: itemIds } },
        data: { status: OrderItemStatus.ENVIADO, sentAt: now },
      });

      const subtotal = order.items.reduce(
        (acc, item) => acc.add(item.subtotal),
        new Prisma.Decimal(0),
      );

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.ENVIADO,
          sentAt: now,
          subtotal: { increment: subtotal },
          total: { increment: subtotal },
          version: { increment: 1 },
        },
      });

      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.OCUPADA },
        });
      }
    });

    const payload: OrderItemsSentPayload = {
      orderId,
      branchId,
      tableId: order.tableId,
      itemIds,
      waiterName: order.waiter.name,
    };

    this.events.emit(DOMAIN_EVENTS.ORDER_ITEMS_SENT, payload);

    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true, combo: true, ingredient: true } } },
    });
  }

  async requestBill(orderId: number, branchId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId, status: OrderStatus.ENVIADO },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CUENTA_PEDIDA },
      });
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.CUENTA_PEDIDA },
        });
      }
    });

    this.events.emit(DOMAIN_EVENTS.TABLE_STATUS_CHANGED, {
      tableId: order.tableId,
      branchId,
      status: TableStatus.CUENTA_PEDIDA,
      orderId,
    });

    return { ok: true };
  }

  async updateItem(orderId: number, itemId: number, dto: UpdateOrderItemDto, branchId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId, status: OrderStatus.ABIERTO },
    });
    if (!order) throw new NotFoundException('Pedido no editable');

    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId, status: OrderItemStatus.BORRADOR },
    });
    if (!item) throw new NotFoundException('Ítem no encontrado o ya enviado');

    const subtotal = item.unitPrice.mul(dto.quantity);
    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity, subtotal },
      include: { product: true, combo: true, ingredient: true },
    });
  }

  async removeItem(orderId: number, itemId: number, branchId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId, status: OrderStatus.ABIERTO },
    });
    if (!order) throw new NotFoundException('Pedido no editable');

    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId, status: OrderItemStatus.BORRADOR },
    });
    if (!item) throw new NotFoundException('Ítem no encontrado o ya enviado');

    await this.prisma.orderItem.delete({ where: { id: itemId } });
    return { ok: true };
  }
}
