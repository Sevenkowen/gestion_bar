import { Injectable } from '@nestjs/common';
import { OrderItemStatus, OrderStatus, OrderType, TableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(branchId: number) {
    const todayStart = startOfDay();
    const tomorrowStart = addDays(todayStart, 1);
    const yesterdayStart = addDays(todayStart, -1);
    const weekStart = addDays(todayStart, -6);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const printerErrorSince = addDays(todayStart, -1);

    const paymentDayWhere = (from: Date, to: Date) => ({
      createdAt: { gte: from, lt: to },
      order: { branchId },
    });

    const [
      todayPayments,
      yesterdayPayments,
      ingredients,
      pendingPrintJobs,
      activeTables,
      totalTables,
      monthPayments,
      monthItemsAgg,
      recentOrders,
      weekItems,
      printerErrors,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: paymentDayWhere(todayStart, tomorrowStart),
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: paymentDayWhere(yesterdayStart, todayStart),
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.ingredient.findMany({ where: { active: true } }),
      this.prisma.printJob.count({
        where: { status: 'PENDIENTE', order: { branchId } },
      }),
      this.prisma.table.count({
        where: { branchId, active: true, status: { not: TableStatus.LIBRE } },
      }),
      this.prisma.table.count({ where: { branchId, active: true } }),
      this.prisma.payment.aggregate({
        where: {
          createdAt: { gte: monthStart, lt: tomorrowStart },
          order: { branchId },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.orderItem.aggregate({
        where: {
          order: {
            branchId,
            status: OrderStatus.CERRADO,
            closedAt: { gte: monthStart, lt: tomorrowStart },
          },
          status: { not: OrderItemStatus.CANCELADO },
        },
        _sum: { quantity: true },
      }),
      this.prisma.order.findMany({
        where: { branchId, status: { not: OrderStatus.CANCELADO } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { table: true },
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: {
            branchId,
            status: OrderStatus.CERRADO,
            closedAt: { gte: weekStart, lt: tomorrowStart },
          },
          status: { not: OrderItemStatus.CANCELADO },
        },
        include: { product: true, combo: true, ingredient: true },
      }),
      this.prisma.printJob.findMany({
        where: {
          status: 'ERROR',
          printerId: { not: null },
          createdAt: { gte: printerErrorSince },
          order: { branchId },
        },
        select: { printerId: true },
        distinct: ['printerId'],
      }),
    ]);

    const salesToday = Number(todayPayments._sum.total ?? 0);
    const salesYesterday = Number(yesterdayPayments._sum.total ?? 0);
    const ordersToday = todayPayments._count;
    const ordersYesterday = yesterdayPayments._count;

    const lowStockAlerts = ingredients.filter((i) => i.currentStock.lte(i.minStock)).length;
    const disconnectedPrinters = printerErrors.length;

    const salesLast7Days: { label: string; date: string; amount: number }[] = [];
    const ordersLast7Days: { label: string; date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const from = addDays(todayStart, -i);
      const to = addDays(from, 1);
      const [sales, orders] = await Promise.all([
        this.prisma.payment.aggregate({
          where: paymentDayWhere(from, to),
          _sum: { total: true },
        }),
        this.prisma.payment.count({ where: paymentDayWhere(from, to) }),
      ]);
      salesLast7Days.push({
        label: DAY_LABELS[from.getDay()],
        date: from.toISOString().slice(0, 10),
        amount: Number(sales._sum.total ?? 0),
      });
      ordersLast7Days.push({
        label: DAY_LABELS[from.getDay()],
        date: from.toISOString().slice(0, 10),
        count: orders,
      });
    }

    const productQty = new Map<string, number>();
    for (const item of weekItems) {
      const name =
        item.product?.name ?? item.combo?.name ?? item.ingredient?.name ?? 'Ítem del menú';
      productQty.set(name, (productQty.get(name) ?? 0) + item.quantity);
    }

    const topProducts = [...productQty.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    const monthSales = Number(monthPayments._sum.total ?? 0);
    const monthOrders = monthPayments._count;
    const productsSoldMonth = Number(monthItemsAgg._sum.quantity ?? 0);

    return {
      salesToday,
      salesTodayChangePct: pctChange(salesToday, salesYesterday),
      ordersToday,
      ordersTodayChange: ordersToday - ordersYesterday,
      activeTables,
      totalTables,
      tablesOccupancyPct:
        totalTables > 0 ? Math.round((activeTables / totalTables) * 100) : 0,
      lowStockAlerts,
      pendingPrintJobs,
      salesLast7Days,
      ordersLast7Days,
      topProducts,
      alerts: {
        lowStockCount: lowStockAlerts,
        disconnectedPrinters,
        allOk: lowStockAlerts === 0 && disconnectedPrinters === 0,
      },
      monthSummary: {
        totalSales: monthSales,
        totalOrders: monthOrders,
        avgTicket: monthOrders > 0 ? Math.round(monthSales / monthOrders) : 0,
        productsSold: productsSoldMonth,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        time: order.updatedAt.toISOString(),
        location: this.orderLocation(order),
        status: this.orderStatusKey(order.status),
        statusLabel: this.orderStatusLabel(order.status),
        total: Number(order.total),
      })),
    };
  }

  private orderLocation(order: {
    table: { number: number } | null;
    type: OrderType;
  }) {
    if (order.table) return `Mesa ${order.table.number}`;
    if (order.type === OrderType.RETIRO) return 'Take away';
    if (order.type === OrderType.DELIVERY) return 'Delivery';
    return 'Mostrador';
  }

  private orderStatusKey(status: OrderStatus) {
    if (status === OrderStatus.CERRADO) return 'LISTO';
    if (status === OrderStatus.CUENTA_PEDIDA) return 'CUENTA';
    if (status === OrderStatus.ENVIADO || status === OrderStatus.ABIERTO) return 'EN_PREPARACION';
    return 'ABIERTO';
  }

  private orderStatusLabel(status: OrderStatus) {
    if (status === OrderStatus.CERRADO) return 'Listo';
    if (status === OrderStatus.CUENTA_PEDIDA) return 'Cuenta pedida';
    if (status === OrderStatus.ENVIADO || status === OrderStatus.ABIERTO) return 'En preparación';
    return status;
  }
}
