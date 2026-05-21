<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { combosApi, type ComboForm } from '@/services/combos.api';
import { productosApi } from '@/services/productos.api';
import { formatMoney } from '@/utils/format';
import type { Combo, Product } from '@/types';

const $q = useQuasar();
const combos = ref<Combo[]>([]);
const productos = ref<Product[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editingId = ref<number | null>(null);

const form = ref<ComboForm>({ name: '', description: '', price: 0, products: [] });

async function load() {
  loading.value = true;
  try {
    [combos.value, productos.value] = await Promise.all([combosApi.list(), productosApi.list()]);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  form.value = { name: '', description: '', price: 0, products: [{ productId: productos.value[0]?.id ?? 0, quantity: 1 }] };
  dialog.value = true;
}

function openEdit(c: Combo) {
  editingId.value = c.id;
  form.value = {
    name: c.name,
    description: c.description ?? '',
    price: parseFloat(c.price),
    products: c.products.map((p) => ({ productId: p.productId, quantity: p.quantity })),
  };
  dialog.value = true;
}

function addProduct() {
  form.value.products.push({ productId: productos.value[0]?.id ?? 0, quantity: 1 });
}

async function save() {
  try {
    if (editingId.value) {
      await combosApi.update(editingId.value, form.value);
    } else {
      await combosApi.create(form.value);
    }
    dialog.value = false;
    await load();
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar combo' });
  }
}

async function remove(id: number) {
  await combosApi.remove(id);
  await load();
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Combos</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nuevo combo" @click="openCreate" />
    </div>

    <q-table flat bordered dark :rows="combos" row-key="id"
      :columns="[
        { name: 'name', label: 'Nombre', field: 'name', align: 'left' },
        { name: 'price', label: 'Precio', field: 'price', align: 'right' },
        { name: 'items', label: 'Productos', field: (r: Combo) => r.products.map(p => p.product.name).join(', '), align: 'left' },
        { name: 'actions', label: '', field: 'id', align: 'right' },
      ]"
    >
      <template #body-cell-price="props">
        <q-td :props="props" class="text-amber">{{ formatMoney(props.row.price) }}</q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat dense icon="edit" @click="openEdit(props.row)" />
          <q-btn flat dense icon="delete" color="negative" @click="remove(props.row.id)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialog" persistent>
      <q-card dark style="min-width: 400px">
        <q-card-section class="text-h6">Combo</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nombre" outlined dark />
          <q-input v-model="form.description" label="Descripción" outlined dark />
          <q-input v-model.number="form.price" label="Precio" type="number" outlined dark />
          <div class="text-subtitle2">Productos incluidos</div>
          <div v-for="(line, idx) in form.products" :key="idx" class="row q-gutter-sm">
            <q-select v-model="line.productId" :options="productos" option-value="id" option-label="name" emit-value map-options outlined dark class="col" />
            <q-input v-model.number="line.quantity" type="number" label="Cant." outlined dark style="width: 80px" />
            <q-btn flat icon="delete" color="negative" @click="form.products.splice(idx, 1)" />
          </div>
          <q-btn flat icon="add" label="Agregar producto" @click="addProduct" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
