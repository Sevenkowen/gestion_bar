<script setup lang="ts">
import { formatMoney } from '@/utils/format';

defineProps<{
  name: string;
  price: string;
  subtitle?: string;
  disabled?: boolean;
}>();

defineEmits<{ add: [] }>();
</script>

<template>
  <q-card flat bordered class="product-card" :class="{ 'product-card--disabled': disabled }">
    <q-card-section class="q-pb-sm">
      <div class="text-subtitle1 text-weight-medium">{{ name }}</div>
      <div v-if="subtitle" class="text-caption text-grey-5">{{ subtitle }}</div>
    </q-card-section>
    <q-card-actions align="between" class="q-px-md q-pb-md">
      <span class="text-h6 text-amber">{{ formatMoney(price) }}</span>
      <q-btn
        round
        color="primary"
        icon="add"
        size="sm"
        :disable="disabled"
        @click="$emit('add')"
      />
    </q-card-actions>
  </q-card>
</template>

<style scoped>
.product-card {
  height: 100%;
}
.product-card--disabled {
  opacity: 0.45;
}
</style>
