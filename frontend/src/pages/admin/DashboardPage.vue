<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { adminApi } from '@/services/admin.api';
import type { DashboardStats } from '@/types';

const stats = ref<DashboardStats | null>(null);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    stats.value = await adminApi.dashboard();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Dashboard</div>

    <q-inner-loading :showing="loading" />

    <div v-if="stats" class="row q-col-gutter-md">
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="bg-grey-10 text-center q-pa-lg">
          <q-icon name="receipt" size="32px" color="amber" />
          <div class="text-h4 q-mt-sm">{{ stats.ordersToday }}</div>
          <div class="text-caption text-grey-5">Ventas hoy</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="bg-grey-10 text-center q-pa-lg">
          <q-icon name="warning" size="32px" color="negative" />
          <div class="text-h4 q-mt-sm">{{ stats.lowStockAlerts }}</div>
          <div class="text-caption text-grey-5">Stock bajo</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="bg-grey-10 text-center q-pa-lg">
          <q-icon name="print" size="32px" color="info" />
          <div class="text-h4 q-mt-sm">{{ stats.pendingPrintJobs }}</div>
          <div class="text-caption text-grey-5">Impresiones pendientes</div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
