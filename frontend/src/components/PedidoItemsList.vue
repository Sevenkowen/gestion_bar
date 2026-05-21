<script setup lang="ts">
import type { OrderItem } from '@/types';
import { formatMoney } from '@/utils/format';

defineProps<{
  items: OrderItem[];
  title?: string;
}>();
</script>

<template>
  <q-list bordered separator class="rounded-borders bg-dark">
    <q-item-label v-if="title" header class="text-amber">{{ title }}</q-item-label>
    <q-item v-for="item in items" :key="item.id">
      <q-item-section avatar>
        <q-avatar color="grey-9" text-color="white" size="sm">{{ item.quantity }}x</q-avatar>
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ item.product?.name ?? item.combo?.name ?? item.ingredient?.name }}</q-item-label>
        <q-item-label v-if="item.notes" caption>{{ item.notes }}</q-item-label>
        <q-item-label caption>{{ item.status }}</q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>{{ formatMoney(item.subtotal) }}</q-item-label>
      </q-item-section>
    </q-item>
    <q-item v-if="!items.length">
      <q-item-section class="text-grey-5 text-center">Sin ítems</q-item-section>
    </q-item>
  </q-list>
</template>
