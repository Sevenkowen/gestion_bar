<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { categoriasApi } from '@/services/categorias.api';
import type { Category } from '@/types';

const $q = useQuasar();
const categorias = ref<Category[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editingId = ref<number | null>(null);
const form = ref({ name: '', sortOrder: 0 });

async function load() {
  loading.value = true;
  try {
    categorias.value = await categoriasApi.list();
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  form.value = { name: '', sortOrder: categorias.value.length + 1 };
  dialog.value = true;
}

function openEdit(c: Category) {
  editingId.value = c.id;
  form.value = { name: c.name, sortOrder: c.sortOrder };
  dialog.value = true;
}

async function save() {
  try {
    if (editingId.value) {
      await categoriasApi.update(editingId.value, form.value);
    } else {
      await categoriasApi.create(form.value);
    }
    dialog.value = false;
    await load();
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar' });
  }
}

async function remove(id: number) {
  await categoriasApi.remove(id);
  await load();
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Categorías</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nueva" @click="openCreate" />
    </div>

    <q-list bordered separator class="rounded-borders">
      <q-item v-for="c in categorias" :key="c.id">
        <q-item-section>{{ c.name }}</q-item-section>
        <q-item-section side><q-badge :label="`Orden ${c.sortOrder}`" /></q-item-section>
        <q-item-section side>
          <q-btn flat dense icon="edit" @click="openEdit(c)" />
          <q-btn flat dense icon="delete" color="negative" @click="remove(c.id)" />
        </q-item-section>
      </q-item>
    </q-list>

    <q-dialog v-model="dialog">
      <q-card dark style="min-width: 300px">
        <q-card-section class="text-h6">Categoría</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nombre" outlined dark />
          <q-input v-model.number="form.sortOrder" label="Orden" type="number" outlined dark />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
