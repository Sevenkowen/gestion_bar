import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, TableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { DOMAIN_EVENTS } from '../../common/events/domain.events';

@Injectable()
export class MesasService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  findAll(branchId: number) {
    return this.prisma.table.findMany({
      where: { branchId, active: true },
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: {
            status: {
              in: [OrderStatus.ABIERTO, OrderStatus.ENVIADO, OrderStatus.CUENTA_PEDIDA],
            },
          },
          take: 1,
          select: { id: true, status: true, total: true },
        },
      },
    });
  }

  findAllAdmin(branchId: number) {
    return this.prisma.table.findMany({
      where: { branchId },
      orderBy: { number: 'asc' },
    });
  }

  async createTable(branchId: number, dto: CreateTableDto) {
    const exists = await this.prisma.table.findFirst({
      where: { branchId, number: dto.number },
    });
    if (exists) throw new ConflictException('Ya existe una mesa con ese número');

    return this.prisma.table.create({
      data: {
        number: dto.number,
        name: dto.name ?? `Mesa ${dto.number}`,
        capacity: dto.capacity ?? 4,
        branchId,
      },
    });
  }

  async updateTable(id: number, branchId: number, dto: UpdateTableDto) {
    const table = await this.prisma.table.findFirst({ where: { id, branchId } });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return this.prisma.table.update({ where: { id }, data: dto });
  }

  async openTable(tableId: number, waiterId: number, branchId: number) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, branchId, active: true },
    });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    if (table.status !== TableStatus.LIBRE) {
      throw new ConflictException('La mesa no está libre');
    }

    const existing = await this.prisma.order.findFirst({
      where: {
        tableId,
        status: { in: [OrderStatus.ABIERTO, OrderStatus.ENVIADO, OrderStatus.CUENTA_PEDIDA] },
      },
    });
    if (existing) throw new ConflictException('La mesa ya tiene un pedido activo');

    const [order] = await this.prisma.$transaction([
      this.prisma.order.create({
        data: {
          tableId,
          waiterId,
          branchId,
          status: OrderStatus.ABIERTO,
        },
        include: { items: true },
      }),
      this.prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCUPADA },
      }),
    ]);

    this.events.emit(DOMAIN_EVENTS.TABLE_STATUS_CHANGED, {
      tableId,
      branchId,
      status: TableStatus.OCUPADA,
      orderId: order.id,
    });

    return order;
  }
}
