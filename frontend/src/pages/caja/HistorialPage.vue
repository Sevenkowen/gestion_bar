<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { cajaApi } from '@/services/caja.api';
import { formatMoney, paymentMethodLabel } from '@/utils/format';
import type { Payment } from '@/types';

const payments = ref<Payment[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    payments.value = await cajaApi.historial();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Historial del día</div>

    <q-inner-loading :showing="loading" />

    <q-table
      flat
      bordered
      dark
      :rows="payments"
      :columns="[
        { name: 'id', label: '#', field: 'id', align: 'left' },
        { name: 'mesa', label: 'Mesa', field: (r: Payment) => r.order?.table?.number ?? '-', align: 'left' },
        { name: 'total', label: 'Total', field: 'total', align: 'right' },
        { name: 'cajero', label: 'Cajero', field: (r: Payment) => r.cashier?.name ?? '-', align: 'left' },
        { name: 'hora', label: 'Hora', field: (r: Payment) => new Date(r.createdAt).toLocaleTimeString('es-AR'), align: 'left' },
        { name: 'metodo', label: 'Pago', field: (r: Payment) => r.lines.map((l: { method: string }) => paymentMethodLabel[l.method]).join(', '), align: 'left' },
      ]"
      row-key="id"
      :rows-per-page-options="[10, 25, 50]"
    >
      <template #body-cell-total="props">
        <q-td :props="props" class="text-amber">{{ formatMoney(props.row.total) }}</q-td>
      </template>
    </q-table>
  </q-page>
</template>
