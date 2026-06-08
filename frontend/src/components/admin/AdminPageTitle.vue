<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    centered?: boolean;
    font?: 'default' | 'chairdrobe';
  }>(),
  { centered: false, font: 'default' },
);
</script>

<template>
  <div
    class="bar-page-title row items-center no-wrap"
    :class="{
      'bar-page-title--centered': centered,
      'bar-page-title--chairdrobe': font === 'chairdrobe',
      'bar-page-title--marked': font === 'chairdrobe',
    }"
  >
    <template v-if="font === 'chairdrobe'">
      <div class="bar-page-title__marks bar-page-title__marks--left" aria-hidden="true">
        <span class="bar-page-title__tick bar-page-title__tick--top" />
        <span class="bar-page-title__tick bar-page-title__tick--mid" />
        <span class="bar-page-title__tick bar-page-title__tick--bot" />
      </div>
      <h1 class="bar-page-title__text">{{ title }}</h1>
      <div class="bar-page-title__marks bar-page-title__marks--right" aria-hidden="true">
        <span class="bar-page-title__tick bar-page-title__tick--top" />
        <span class="bar-page-title__tick bar-page-title__tick--mid" />
        <span class="bar-page-title__tick bar-page-title__tick--bot" />
      </div>
    </template>
    <template v-else>
      <div class="col row items-center no-wrap">
        <div class="bar-page-title__line" />
        <h1 class="bar-page-title__text">{{ title }}</h1>
        <div class="bar-page-title__line bar-page-title__line--short" />
      </div>
      <div v-if="$slots.action" class="col-auto q-ml-md">
        <slot name="action" />
      </div>
    </template>
  </div>
</template>
