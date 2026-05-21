import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PrintJobStatus,
  PrintJobType,
  PrintSector,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DOMAIN_EVENTS, OrderItemsSentPayload } from '../../common/events/domain.events';

interface TicketContent {
  header: string;
  tableNumber?: number;
  orderId: number;
  waiterName: string;
  items: { name: string; quantity: number; notes?: string | null }[];
  timestamp: string;
}

@Injectable()
export class ImpresionService {
  private readonly logger = new Logger(ImpresionService.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent(DOMAIN_EVENTS.ORDER_ITEMS_SENT)
  async handleOrderSent(payload: OrderItemsSentPayload) {
    this.logger.log(`Generando jobs de impresión para pedido #${payload.orderId}`);
    await this.createJobsForOrder(payload);
  }

  async createJobsForOrder(payload: OrderItemsSentPayload) {
    const items = await this.prisma.orderItem.findMany({
      where: { id: { in: payload.itemIds } },
      include: {
        product: true,
        ingredient: true,
        combo: {
          include: {
            products: { include: { product: true } },
          },
        },
      },
    });

    const table = payload.tableId
      ? await this.prisma.table.findUnique({ where: { id: payload.tableId } })
      : null;

    const bySector = new Map<PrintSector, TicketContent['items']>();

    for (const item of items) {
      if (item.combo) {
        for (const cp of item.combo.products) {
          const sector = cp.product.printSector;
          if (sector === PrintSector.NINGUNO) continue;
          this.addToSector(bySector, sector, {
            name: `${cp.product.name} (combo ${item.combo.name})`,
            quantity: cp.quantity * item.quantity,
            notes: item.notes,
          });
        }
      } else if (item.product) {
        const sector = item.product.printSector;
        if (sector === PrintSector.NINGUNO) continue;
        this.addToSector(bySector, sector, {
          name: item.product.name,
          quantity: item.quantity,
          notes: item.notes,
        });
      } else if (item.ingredient) {
        this.addToSector(bySector, PrintSector.BARRA, {
          name: item.ingredient.name,
          quantity: item.quantity,
          notes: item.notes,
        });
      }
    }

    const jobs: Prisma.PrintJobCreateManyInput[] = [];

    for (const [sector, sectorItems] of bySector) {
      if (!sectorItems.length) continue;

      const printer = await this.prisma.printer.findFirst({
        where: { branchId: payload.branchId, sector, active: true },
      });

      const content: TicketContent = {
        header: sector === PrintSector.COCINA ? 'COCINA' : 'BARRA',
        tableNumber: table?.number,
        orderId: payload.orderId,
        waiterName: payload.waiterName,
        items: sectorItems,
        timestamp: new Date().toISOString(),
      };

      jobs.push({
        printerId: printer?.id,
        orderId: payload.orderId,
        type: sector === PrintSector.COCINA ? PrintJobType.COMANDA_COCINA : PrintJobType.COMANDA_BARRA,
        sector,
        content: content as unknown as Prisma.InputJsonValue,
        status: PrintJobStatus.PENDIENTE,
      });
    }

    if (jobs.length) {
      await this.prisma.printJob.createMany({ data: jobs });
    }
  }

  private addToSector(
    map: Map<PrintSector, TicketContent['items']>,
    sector: PrintSector,
    item: TicketContent['items'][0],
  ) {
    const list = map.get(sector) ?? [];
    list.push(item);
    map.set(sector, list);
  }

  async getPendingJobs(limit = 10) {
    return this.prisma.printJob.findMany({
      where: { status: PrintJobStatus.PENDIENTE },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { printer: true },
    });
  }

  async markPrinted(jobId: number) {
    return this.prisma.printJob.update({
      where: { id: jobId },
      data: { status: PrintJobStatus.IMPRESO, printedAt: new Date() },
    });
  }

  async markError(jobId: number, errorMessage: string) {
    const job = await this.prisma.printJob.findUniqueOrThrow({ where: { id: jobId } });
    const attempts = job.attempts + 1;
    const status =
      attempts >= job.maxAttempts ? PrintJobStatus.ERROR : PrintJobStatus.PENDIENTE;

    return this.prisma.printJob.update({
      where: { id: jobId },
      data: { attempts, errorMessage, status },
    });
  }

  findAllPrinters(branchId: number) {
    return this.prisma.printer.findMany({
      where: { branchId },
      orderBy: { sector: 'asc' },
    });
  }

  createPrinter(branchId: number, data: {
    name: string;
    sector: PrintSector;
    address: string;
    connectionType?: string;
  }) {
    return this.prisma.printer.create({
      data: { ...data, branchId },
    });
  }

  async updatePrinter(id: number, branchId: number, data: {
    name?: string;
    address?: string;
    active?: boolean;
  }) {
    const printer = await this.prisma.printer.findFirst({ where: { id, branchId } });
    if (!printer) throw new NotFoundException('Impresora no encontrada');
    return this.prisma.printer.update({ where: { id }, data });
  }
}
