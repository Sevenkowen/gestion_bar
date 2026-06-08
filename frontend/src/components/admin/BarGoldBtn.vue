<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    loading?: boolean;
    disable?: boolean;
  }>(),
  { loading: false, disable: false },
);

defineEmits<{ click: [] }>();
</script>

<template>
  <q-btn
    unelevated
    no-caps
    class="bar-btn-gold"
    :label="label"
    :icon="icon"
    :loading="loading"
    :disable="disable"
    @click="$emit('click')"
  />
</template>
