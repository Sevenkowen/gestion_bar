<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { impresionApi, type Printer } from '@/services/impresion.api';
import type { PrintSector } from '@/types';

const $q = useQuasar();
const impresoras = ref<Printer[]>([]);
const jobs = ref<{ id: number; status: string; sector: string; errorMessage: string | null; createdAt: string }[]>([]);
const dialog = ref(false);
const editingId = ref<number | null>(null);

const sectors: { label: string; value: PrintSector }[] = [
  { label: 'Cocina', value: 'COCINA' },
  { label: 'Barra', value: 'BARRA' },
];

const form = ref<{ name: string; sector: PrintSector; address: string }>({
  name: '',
  sector: 'COCINA',
  address: '192.168.1.100:9100',
});

async function load() {
  [impresoras.value, jobs.value] = await Promise.all([impresionApi.impresoras(), impresionApi.jobs()]);
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  form.value = { name: '', sector: 'COCINA', address: '192.168.1.100:9100' };
  dialog.value = true;
}

function openEdit(p: Printer) {
  editingId.value = p.id;
  form.value = { name: p.name, sector: p.sector, address: p.address };
  dialog.value = true;
}

async function save() {
  try {
    if (editingId.value) {
      await impresionApi.updateImpresora(editingId.value, form.value);
    } else {
      await impresionApi.createImpresora(form.value);
    }
    dialog.value = false;
    await load();
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar' });
  }
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Impresoras</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nueva" @click="openCreate" />
    </div>

    <q-list bordered separator class="rounded-borders q-mb-lg">
      <q-item v-for="p in impresoras" :key="p.id">
        <q-item-section avatar><q-icon name="print" /></q-item-section>
        <q-item-section>
          <q-item-label>{{ p.name }} — {{ p.sector }}</q-item-label>
          <q-item-label caption>{{ p.address }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge :color="p.active ? 'positive' : 'grey'" :label="p.active ? 'Activa' : 'Inactiva'" />
          <q-btn flat dense icon="edit" @click="openEdit(p)" />
        </q-item-section>
      </q-item>
    </q-list>

    <div class="text-subtitle1 q-mb-sm">Últimos trabajos de impresión</div>
    <q-table flat bordered dark :rows="jobs.slice(0, 20)" row-key="id"
      :columns="[
        { name: 'id', label: '#', field: 'id' },
        { name: 'sector', label: 'Sector', field: 'sector' },
        { name: 'status', label: 'Estado', field: 'status' },
        { name: 'error', label: 'Error', field: 'errorMessage' },
      ]"
    />

    <q-dialog v-model="dialog">
      <q-card dark style="min-width: 350px">
        <q-card-section class="text-h6">Impresora</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nombre" outlined dark />
          <q-select v-model="form.sector" :options="sectors" emit-value map-options label="Sector" outlined dark />
          <q-input v-model="form.address" label="IP:Puerto" outlined dark hint="Ej: 192.168.1.100:9100" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
