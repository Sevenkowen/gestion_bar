import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma, StockMovementType, IngredientKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DOMAIN_EVENTS, OrderItemsSentPayload } from '../../common/events/domain.events';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/ingredient.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  @OnEvent(DOMAIN_EVENTS.ORDER_ITEMS_SENT)
  async handleOrderSent(payload: OrderItemsSentPayload) {
    this.logger.log(`Descontando stock para pedido #${payload.orderId}`);
    await this.deductForOrderItems(payload.orderId, payload.itemIds);
  }

  async deductForOrderItems(orderId: number, itemIds: number[]) {
    const items = await this.prisma.orderItem.findMany({
      where: { id: { in: itemIds }, orderId },
      include: {
        product: { include: { recipe: true } },
        combo: { include: { products: { include: { product: { include: { recipe: true } } } } } },
        ingredient: true,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const productsToDeduct = this.expandItemToProducts(item);
        const ingredientsToDeduct = this.expandItemToIngredients(item);

        for (const { productId, quantity } of productsToDeduct) {
          const recipe = await tx.productIngredient.findMany({
            where: { productId },
            include: { ingredient: true },
          });

          for (const line of recipe) {
            const deductQty = line.quantity.mul(quantity);
            await this.applyMovement(tx, {
              ingredientId: line.ingredientId,
              quantity: deductQty.neg(),
              type: StockMovementType.VENTA,
              referenceType: 'Order',
              referenceId: orderId,
            });
          }
        }

        for (const { ingredientId, quantity } of ingredientsToDeduct) {
          await this.applyMovement(tx, {
            ingredientId,
            quantity: new Prisma.Decimal(quantity).neg(),
            type: StockMovementType.VENTA,
            referenceType: 'Order',
            referenceId: orderId,
          });
        }
      }
    });

    await this.recalculateAllAvailability();
  }

  /** Expande OrderItem a lista de { productId, quantity } */
  private expandItemToProducts(item: {
    productId: number | null;
    comboId: number | null;
    ingredientId: number | null;
    quantity: number;
    product: { id: number; recipe: unknown[] } | null;
    combo: {
      products: { productId: number; quantity: number; product: { id: number } }[];
    } | null;
    ingredient: { id: number } | null;
  }): { productId: number; quantity: number }[] {
    if (item.productId && item.product) {
      return [{ productId: item.productId, quantity: item.quantity }];
    }
    if (item.combo?.products) {
      return item.combo.products.map((cp) => ({
        productId: cp.productId,
        quantity: cp.quantity * item.quantity,
      }));
    }
    return [];
  }

  private expandItemToIngredients(item: {
    ingredientId: number | null;
    quantity: number;
    ingredient: { id: number } | null;
  }): { ingredientId: number; quantity: number }[] {
    if (item.ingredientId && item.ingredient) {
      return [{ ingredientId: item.ingredientId, quantity: item.quantity }];
    }
    return [];
  }

  private async applyMovement(
    tx: TxClient,
    data: {
      ingredientId: number;
      quantity: Prisma.Decimal;
      type: StockMovementType;
      referenceType: string;
      referenceId: number;
      userId?: number;
      notes?: string;
    },
  ) {
    const ingredient = await tx.ingredient.findUniqueOrThrow({
      where: { id: data.ingredientId },
    });

    const previousStock = ingredient.currentStock;
    const newStock = previousStock.add(data.quantity);

    if (newStock.lt(0)) {
      throw new Error(`Stock insuficiente de insumo: ${ingredient.name}`);
    }

    await tx.ingredient.update({
      where: { id: data.ingredientId },
      data: { currentStock: newStock },
    });

    await tx.stockMovement.create({
      data: {
        ingredientId: data.ingredientId,
        type: data.type,
        quantity: data.quantity,
        previousStock,
        newStock,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        userId: data.userId,
        notes: data.notes,
      },
    });

    this.events.emit(DOMAIN_EVENTS.STOCK_MOVEMENT_CREATED, {
      ingredientId: data.ingredientId,
    });
  }

  /** CRUD ingredientes */
  findAllIngredients(kind?: IngredientKind) {
    return this.prisma.ingredient.findMany({
      where: kind ? { kind } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createIngredient(dto: CreateIngredientDto) {
    const exists = await this.prisma.ingredient.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Ya existe ese insumo');

    const ingredient = await this.prisma.ingredient.create({
      data: {
        name: dto.name,
        kind: dto.kind ?? IngredientKind.COCINA,
        unit: dto.unit,
        currentStock: dto.currentStock ?? 0,
        minStock: dto.minStock ?? 0,
        cost: dto.cost ?? 0,
      },
    });
    await this.recalculateAllAvailability();
    return ingredient;
  }

  async updateIngredient(id: number, dto: UpdateIngredientDto) {
    const ing = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!ing) throw new NotFoundException('Insumo no encontrado');
    const updated = await this.prisma.ingredient.update({ where: { id }, data: dto });
    await this.recalculateAllAvailability();
    return updated;
  }

  async adjustStock(ingredientId: number, quantity: number, userId: number, notes?: string) {
    await this.prisma.$transaction(async (tx) => {
      const type =
        quantity >= 0 ? StockMovementType.ENTRADA : StockMovementType.SALIDA;
      await this.applyMovement(tx, {
        ingredientId,
        quantity: new Prisma.Decimal(quantity),
        type,
        referenceType: 'Manual',
        referenceId: ingredientId,
        userId,
        notes,
      });
    });
    await this.recalculateAllAvailability();
    return this.prisma.ingredient.findUnique({ where: { id: ingredientId } });
  }

  /** Recalcula autoAvailable para todos los productos con receta */
  async recalculateAllAvailability() {
    const products = await this.prisma.product.findMany({
      where: { active: true, deletedAt: null },
      include: { recipe: { include: { ingredient: true } } },
    });

    for (const product of products) {
      if (!product.recipe.length) continue;

      const available = product.recipe.every(
        (line) => line.ingredient.currentStock.gte(line.quantity),
      );

      if (product.autoAvailable !== available) {
        await this.prisma.product.update({
          where: { id: product.id },
          data: { autoAvailable: available },
        });

        this.events.emit(DOMAIN_EVENTS.PRODUCT_AVAILABILITY_CHANGED, {
          productId: product.id,
          branchId: product.branchId,
          available: product.manualAvailable && available,
        });
      }
    }
  }
}
