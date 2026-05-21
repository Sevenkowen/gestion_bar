<script setup lang="ts">
import type { Mesa } from '@/types';
import { mesaStatusColor, mesaStatusLabel } from '@/utils/format';

defineProps<{
  mesa: Mesa;
}>();

defineEmits<{ click: [] }>();
</script>

<template>
  <q-card
    flat
    bordered
    class="mesa-card cursor-pointer"
    :class="`mesa-card--${mesa.status.toLowerCase()}`"
    @click="$emit('click')"
  >
    <q-card-section class="text-center q-pa-md">
      <div class="text-h4 text-weight-bold">{{ mesa.number }}</div>
      <div class="text-caption text-grey-5">{{ mesa.name ?? `Mesa ${mesa.number}` }}</div>
      <q-badge
        :color="mesaStatusColor[mesa.status] ?? 'grey'"
        class="q-mt-sm"
        :label="mesaStatusLabel[mesa.status] ?? mesa.status"
      />
      <div v-if="mesa.orders[0]" class="text-caption q-mt-xs text-amber">
        ${{ mesa.orders[0].total }}
      </div>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.mesa-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  min-height: 120px;
}
.mesa-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.mesa-card--libre {
  border-color: rgba(76, 175, 80, 0.4);
}
.mesa-card--ocupada {
  border-color: rgba(255, 193, 7, 0.5);
}
.mesa-card--cuenta_pedida {
  border-color: rgba(33, 150, 243, 0.5);
}
</style>
