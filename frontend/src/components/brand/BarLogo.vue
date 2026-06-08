<script setup lang="ts">
import { computed } from 'vue';
import logoFlaco from '@/assets/logo-flaco.png';

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg' | 'xl';
    layout?: 'horizontal' | 'stacked';
    badgeOnly?: boolean;
  }>(),
  { size: 'md', badgeOnly: false },
);

const effectiveLayout = computed(() => {
  if (props.layout) return props.layout;
  return props.size === 'xl' ? 'stacked' : 'horizontal';
});

const showWordmark = computed(() => !props.badgeOnly && props.size !== 'sm');
</script>

<template>
  <div
    class="bar-logo-root"
    role="img"
    aria-label="La cocina del Flaco — Hamburguesas artesanales"
    :class="[
      `bar-logo-root--${size}`,
      `bar-logo-root--${effectiveLayout}`,
      { 'bar-logo-root--wordmark': showWordmark },
    ]"
  >
    <img
      :src="logoFlaco"
      alt=""
      aria-hidden="true"
      class="bar-logo__badge"
    />
    <div v-if="showWordmark" class="bar-logo__wordmark">
      <span class="bar-logo__script">La cocina del Flaco</span>
      <span class="bar-logo__sans">Hamburguesas artesanales</span>
    </div>
  </div>
</template>
