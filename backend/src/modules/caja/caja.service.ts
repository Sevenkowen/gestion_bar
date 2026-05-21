import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, TableStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DOMAIN_EVENTS } from '../../common/events/domain.events';
import { CobrarDto } from './dto/cobrar.dto';

@Injectable()
export class CajaService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async getPendingTables(branchId: number) {
    return this.prisma.table.findMany({
      where: { branchId, status: TableStatus.CUENTA_PEDIDA },
      include: {
        orders: {
          where: { status: OrderStatus.CUENTA_PEDIDA },
          include: {
            items: { include: { product: true, combo: true } },
            waiter: { select: { name: true } },
          },
        },
      },
    });
  }

  async cobrar(orderId: number, dto: CobrarDto, cashierId: number, branchId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId, status: OrderStatus.CUENTA_PEDIDA },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado o no pendiente de cobro');

    const totalPaid = dto.payments.reduce(
      (acc, p) => acc.add(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );

    if (totalPaid.lt(order.total)) {
      throw new UnprocessableEntityException(
        `Monto insuficiente: ${totalPaid} < ${order.total}`,
      );
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          orderId,
          cashierId,
          total: order.total,
          lines: {
            create: dto.payments.map((line) => ({
              method: line.method,
              amount: line.amount,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CERRADO, closedAt: new Date() },
      });

      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.LIBRE },
        });
      }

      return p;
    });

    this.events.emit(DOMAIN_EVENTS.PAYMENT_COMPLETED, {
      tableId: order.tableId!,
      branchId,
      paymentId: payment.id,
    });

    if (order.tableId) {
      this.events.emit(DOMAIN_EVENTS.TABLE_STATUS_CHANGED, {
        tableId: order.tableId,
        branchId,
        status: TableStatus.LIBRE,
      });
    }

    return payment;
  }

  getSalesHistory(branchId: number, date?: string) {
    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        order: { branchId },
      },
      include: {
        order: { include: { table: true } },
        lines: true,
        cashier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
