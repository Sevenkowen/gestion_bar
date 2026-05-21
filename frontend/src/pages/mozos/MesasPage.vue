<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMesasStore } from '@/stores/mesas.store';
import MesaCard from '@/components/MesaCard.vue';
import type { Mesa } from '@/types';

const router = useRouter();
const mesas = useMesasStore();

onMounted(async () => {
  await mesas.fetchMesas();
  mesas.subscribeRealtime();
});

onUnmounted(() => {
  // socket listener stays; refreshed on remount
});

function openMesa(mesa: Mesa) {
  void router.push(`/mozos/mesa/${mesa.id}`);
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Mesas</div>

    <q-inner-loading :showing="mesas.loading" />

    <div class="row q-col-gutter-md">
      <div
        v-for="mesa in mesas.mesas"
        :key="mesa.id"
        class="col-6 col-sm-4 col-md-3 col-lg-2"
      >
        <MesaCard :mesa="mesa" @click="openMesa(mesa)" />
      </div>
    </div>
  </q-page>
</template>
