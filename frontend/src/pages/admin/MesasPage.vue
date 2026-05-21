<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { mesasApi } from '@/services/mesas.api';
import { mesaStatusLabel, mesaStatusColor } from '@/utils/format';
import type { Mesa } from '@/types';

const $q = useQuasar();
const mesas = ref<Mesa[]>([]);
const dialog = ref(false);
const form = ref({ number: 1, name: '', capacity: 4 });

async function load() {
  mesas.value = await mesasApi.listAdmin();
}

onMounted(() => void load());

function openCreate() {
  form.value = { number: mesas.value.length + 1, name: '', capacity: 4 };
  dialog.value = true;
}

async function save() {
  try {
    await mesasApi.create({
      number: form.value.number,
      ...(form.value.name ? { name: form.value.name } : {}),
      capacity: form.value.capacity,
    });
    dialog.value = false;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error' });
  }
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Mesas</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nueva mesa" @click="openCreate" />
    </div>

    <div class="row q-col-gutter-md">
      <div v-for="mesa in mesas" :key="mesa.id" class="col-6 col-sm-4 col-md-3">
        <q-card flat bordered class="text-center q-pa-md">
          <div class="text-h4">{{ mesa.number }}</div>
          <div class="text-caption">{{ mesa.name }}</div>
          <q-badge :color="mesaStatusColor[mesa.status] ?? 'grey'" :label="mesaStatusLabel[mesa.status] ?? mesa.status" class="q-mt-sm" />
          <div class="text-caption q-mt-xs">Capacidad: {{ mesa.capacity }}</div>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="dialog">
      <q-card dark style="min-width: 300px">
        <q-card-section class="text-h6">Nueva mesa</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model.number="form.number" label="Número" type="number" outlined dark />
          <q-input v-model="form.name" label="Nombre (opcional)" outlined dark />
          <q-input v-model.number="form.capacity" label="Capacidad" type="number" outlined dark />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Crear" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
