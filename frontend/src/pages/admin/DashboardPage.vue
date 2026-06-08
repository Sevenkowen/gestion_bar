<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '@/services/admin.api';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import type { DashboardStats } from '@/types';

const stats = ref<DashboardStats | null>(null);
const loading = ref(false);

const chartMax = computed(() => {
  if (!stats.value) return 1;
  const max = Math.max(...stats.value.salesLast7Days.map((d) => d.amount), 1);
  return Math.ceil(max / 10000) * 10000 || max;
});

const salesSpark = computed(() => sparkHeights(stats.value?.salesLast7Days.map((d) => d.amount) ?? []));
const ordersSpark = computed(() => sparkHeights(stats.value?.ordersLast7Days.map((d) => d.count) ?? []));

onMounted(async () => {
  loading.value = true;
  try {
    stats.value = await adminApi.dashboard();
  } finally {
    loading.value = false;
  }
});

function sparkHeights(values: number[]) {
  const max = Math.max(...values, 1);
  return values.map((v) => Math.max(10, Math.round((v / max) * 100)));
}

function formatMoney(value: number, decimals = 0) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPrice(value: number) {
  return `$ ${formatMoney(value)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function salesChangeLabel(pct: number | null) {
  if (pct === null) return 'Sin datos ayer';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}% vs ayer`;
}

function ordersChangeLabel(delta: number) {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta} vs ayer`;
}

function statusBadgeClass(status: string) {
  if (status === 'LISTO') return 'dashboard-badge--ok';
  if (status === 'EN_PREPARACION') return 'dashboard-badge--warn';
  return 'dashboard-badge--muted';
}

function barHeight(amount: number) {
  if (!chartMax.value) return 0;
  return `${Math.max(4, Math.round((amount / chartMax.value) * 100))}%`;
}
</script>

<template>
  <q-page class="q-pa-md admin-page fit dashboard-page">
    <div class="admin-page__header">
      <AdminPageTitle title="Dashboard" font="chairdrobe" />
    </div>

    <div class="admin-page__body dashboard-page__body">
      <q-inner-loading :showing="loading" color="primary" />

      <template v-if="stats">
        <!-- KPIs -->
        <div class="dashboard-kpis">
          <div class="dashboard-kpi bar-panel">
            <div class="dashboard-kpi__head">
              <q-icon name="payments" class="dashboard-kpi__icon" />
              <span class="dashboard-kpi__label">Ventas hoy</span>
            </div>
            <div class="dashboard-kpi__value">{{ formatPrice(stats.salesToday) }}</div>
            <div
              class="dashboard-kpi__delta"
              :class="stats.salesTodayChangePct !== null && stats.salesTodayChangePct >= 0 ? 'dashboard-kpi__delta--up' : 'dashboard-kpi__delta--down'"
            >
              {{ salesChangeLabel(stats.salesTodayChangePct) }}
            </div>
            <div class="dashboard-kpi__spark" aria-hidden="true">
              <span
                v-for="(h, i) in salesSpark"
                :key="i"
                class="dashboard-kpi__spark-bar"
                :style="{ height: `${h}%` }"
              />
            </div>
          </div>

          <div class="dashboard-kpi bar-panel">
            <div class="dashboard-kpi__head">
              <q-icon name="receipt_long" class="dashboard-kpi__icon" />
              <span class="dashboard-kpi__label">Pedidos hoy</span>
            </div>
            <div class="dashboard-kpi__value">{{ stats.ordersToday }}</div>
            <div
              class="dashboard-kpi__delta"
              :class="stats.ordersTodayChange >= 0 ? 'dashboard-kpi__delta--up' : 'dashboard-kpi__delta--down'"
            >
              {{ ordersChangeLabel(stats.ordersTodayChange) }}
            </div>
            <div class="dashboard-kpi__spark" aria-hidden="true">
              <span
                v-for="(h, i) in ordersSpark"
                :key="i"
                class="dashboard-kpi__spark-bar"
                :style="{ height: `${h}%` }"
              />
            </div>
          </div>

          <div class="dashboard-kpi bar-panel">
            <div class="dashboard-kpi__head">
              <q-icon name="table_restaurant" class="dashboard-kpi__icon" />
              <span class="dashboard-kpi__label">Mesas activas</span>
            </div>
            <div class="dashboard-kpi__value">
              {{ stats.activeTables }} / {{ stats.totalTables }}
            </div>
            <div class="dashboard-kpi__meta">{{ stats.tablesOccupancyPct }}% ocupadas</div>
            <div class="dashboard-kpi__progress">
              <div class="dashboard-kpi__progress-fill" :style="{ width: `${stats.tablesOccupancyPct}%` }" />
            </div>
          </div>

          <div class="dashboard-kpi bar-panel">
            <div class="dashboard-kpi__head">
              <q-icon name="inventory_2" class="dashboard-kpi__icon" />
              <span class="dashboard-kpi__label">Stock bajo</span>
            </div>
            <div class="dashboard-kpi__value">{{ stats.lowStockAlerts }}</div>
            <div class="dashboard-kpi__meta dashboard-kpi__meta--danger">insumos críticos</div>
            <q-icon name="warning_amber" class="dashboard-kpi__warn-icon" />
          </div>
        </div>

        <!-- Gráfico + top productos -->
        <div class="dashboard-row dashboard-row--2">
          <div class="dashboard-panel bar-table-shell">
            <div class="dashboard-panel__head">
              <span class="dashboard-panel__title">Ventas de los últimos 7 días</span>
              <span class="dashboard-panel__tag">Semanal</span>
            </div>
            <div class="dashboard-chart">
              <div class="dashboard-chart__y">
                <span>{{ formatMoney(chartMax / 1000, 0) }}k</span>
                <span>{{ formatMoney(chartMax / 2000, 0) }}k</span>
                <span>$0</span>
              </div>
              <div class="dashboard-chart__bars">
                <div
                  v-for="day in stats.salesLast7Days"
                  :key="day.date"
                  class="dashboard-chart__col"
                >
                  <div class="dashboard-chart__bar-wrap">
                    <div class="dashboard-chart__bar" :style="{ height: barHeight(day.amount) }" />
                  </div>
                  <span class="dashboard-chart__label">{{ day.label }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="dashboard-panel bar-table-shell">
            <div class="dashboard-panel__head">
              <span class="dashboard-panel__title">Productos más vendidos</span>
            </div>
            <ul v-if="stats.topProducts.length" class="dashboard-top">
              <li v-for="(item, idx) in stats.topProducts" :key="item.name" class="dashboard-top__item">
                <span class="dashboard-top__rank">{{ idx + 1 }}</span>
                <span class="dashboard-top__avatar">{{ item.name.charAt(0) }}</span>
                <span class="dashboard-top__name">{{ item.name }}</span>
                <span class="dashboard-top__qty">{{ item.quantity }} uds.</span>
              </li>
            </ul>
            <div v-else class="dashboard-panel__empty">Sin ventas esta semana</div>
          </div>
        </div>

        <!-- Alertas + mes + pedidos -->
        <div class="dashboard-row dashboard-row--3">
          <div class="dashboard-panel bar-table-shell">
            <div class="dashboard-panel__head">
              <span class="dashboard-panel__title">Alertas importantes</span>
            </div>
            <ul class="dashboard-alerts">
              <li v-if="stats.alerts.lowStockCount > 0" class="dashboard-alerts__item dashboard-alerts__item--danger">
                <q-icon name="error_outline" />
                <div>
                  <strong>{{ stats.alerts.lowStockCount }} insumos con stock bajo</strong>
                  <span>Revisá Insumos y stock</span>
                </div>
              </li>
              <li v-if="stats.alerts.disconnectedPrinters > 0" class="dashboard-alerts__item dashboard-alerts__item--warn">
                <q-icon name="warning_amber" />
                <div>
                  <strong>{{ stats.alerts.disconnectedPrinters }} impresoras con error</strong>
                  <span>Jobs fallidos en las últimas 24 h</span>
                </div>
              </li>
              <li v-if="stats.alerts.allOk" class="dashboard-alerts__item dashboard-alerts__item--ok">
                <q-icon name="check_circle_outline" />
                <div>
                  <strong>Todo funcionando correctamente</strong>
                  <span>Sistema operativo sin alertas</span>
                </div>
              </li>
              <li v-if="stats.pendingPrintJobs > 0" class="dashboard-alerts__item dashboard-alerts__item--warn">
                <q-icon name="print" />
                <div>
                  <strong>{{ stats.pendingPrintJobs }} impresiones pendientes</strong>
                  <span>Cola de impresión activa</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="dashboard-panel bar-table-shell">
            <div class="dashboard-panel__head">
              <span class="dashboard-panel__title">Resumen del mes</span>
            </div>
            <ul class="dashboard-summary">
              <li>
                <q-icon name="payments" />
                <span>Ventas totales</span>
                <strong>{{ formatPrice(stats.monthSummary.totalSales) }}</strong>
              </li>
              <li>
                <q-icon name="receipt_long" />
                <span>Pedidos totales</span>
                <strong>{{ formatMoney(stats.monthSummary.totalOrders) }}</strong>
              </li>
              <li>
                <q-icon name="sell" />
                <span>Ticket promedio</span>
                <strong>{{ formatPrice(stats.monthSummary.avgTicket) }}</strong>
              </li>
              <li>
                <q-icon name="shopping_bag" />
                <span>Productos vendidos</span>
                <strong>{{ formatMoney(stats.monthSummary.productsSold) }}</strong>
              </li>
            </ul>
          </div>

          <div class="dashboard-panel bar-table-shell">
            <div class="dashboard-panel__head">
              <span class="dashboard-panel__title">Últimos pedidos</span>
            </div>
            <div v-if="stats.recentOrders.length" class="dashboard-recent-wrap">
              <table class="dashboard-recent">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Hora</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in stats.recentOrders" :key="order.id">
                    <td>#{{ order.id }}</td>
                    <td>{{ formatTime(order.time) }}</td>
                    <td>{{ order.location }}</td>
                    <td>
                      <span class="dashboard-badge" :class="statusBadgeClass(order.status)">
                        {{ order.statusLabel }}
                      </span>
                    </td>
                    <td class="text-price text-right">{{ formatPrice(order.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="dashboard-panel__empty">Sin pedidos recientes</div>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>
