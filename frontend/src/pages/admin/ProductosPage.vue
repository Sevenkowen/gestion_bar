<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { productosApi, type ProductForm } from '@/services/productos.api';
import { categoriasApi } from '@/services/categorias.api';
import { stockApi } from '@/services/stock.api';
import { formatMoney } from '@/utils/format';
import type { Product, Category, Ingredient, PrintSector } from '@/types';

const $q = useQuasar();
const productos = ref<Product[]>([]);
const categorias = ref<Category[]>([]);
const insumos = ref<Ingredient[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editingId = ref<number | null>(null);

const sectors: { label: string; value: PrintSector }[] = [
  { label: 'Cocina', value: 'COCINA' },
  { label: 'Barra', value: 'BARRA' },
  { label: 'Ninguno', value: 'NINGUNO' },
];

const emptyForm = (): ProductForm & { active?: boolean } => ({
  name: '',
  description: '',
  price: 0,
  categoryId: 0,
  printSector: 'COCINA',
  manualAvailable: true,
  recipe: [],
});

const form = ref(emptyForm());

const categoriaBebidas = computed(() =>
  categorias.value.find((c) => c.name === 'Bebidas')?.id,
);

/** Recetas de comida → insumos COCINA. Productos en categoría Bebidas → insumos BEBIDA. */
const insumosReceta = computed(() => {
  const isBebida = form.value.categoryId === categoriaBebidas.value;
  return insumos.value.filter((i) => {
    const kind = i.kind ?? 'COCINA';
    return isBebida ? kind === 'BEBIDA' : kind === 'COCINA';
  });
});

async function load() {
  loading.value = true;
  try {
    [productos.value, categorias.value, insumos.value] = await Promise.all([
      productosApi.list(),
      categoriasApi.list(),
      stockApi.ingredientes(),
    ]);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  form.value = { ...emptyForm(), categoryId: categorias.value[0]?.id ?? 0 };
  dialog.value = true;
}

function openEdit(p: Product) {
  editingId.value = p.id;
  form.value = {
    name: p.name,
    description: p.description ?? '',
    price: parseFloat(p.price),
    categoryId: p.categoryId,
    printSector: p.printSector,
    manualAvailable: p.manualAvailable,
    active: p.active,
    recipe: p.recipe?.map((r) => ({ ingredientId: r.ingredientId, quantity: parseFloat(r.quantity) })) ?? [],
  };
  dialog.value = true;
}

function addRecipeLine() {
  if (!form.value.recipe) form.value.recipe = [];
  const first = insumosReceta.value[0];
  form.value.recipe.push({ ingredientId: first?.id ?? 0, quantity: 1 });
}

async function save() {
  try {
    if (editingId.value) {
      await productosApi.update(editingId.value, form.value);
    } else {
      await productosApi.create(form.value);
    }
    $q.notify({ type: 'positive', message: 'Producto guardado' });
    dialog.value = false;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error al guardar' });
  }
}

function remove(id: number) {
  $q.dialog({ title: 'Eliminar', message: '¿Desactivar este producto?', cancel: true }).onOk(() => {
    void productosApi.remove(id).then(() => load());
  });
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Productos</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nuevo producto" @click="openCreate" />
    </div>

    <q-inner-loading :showing="loading" />

    <q-table
      flat bordered dark :rows="productos" row-key="id"
      :columns="[
        { name: 'name', label: 'Nombre', field: 'name', align: 'left' },
        { name: 'category', label: 'Categoría', field: (r: Product) => r.category?.name ?? '-', align: 'left' },
        { name: 'price', label: 'Precio', field: 'price', align: 'right' },
        { name: 'sector', label: 'Impresión', field: 'printSector', align: 'left' },
        { name: 'available', label: 'OK', field: (r: Product) => r.manualAvailable && r.autoAvailable ? '✓' : '✗', align: 'center' },
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

    <q-dialog v-model="dialog" persistent maximized>
      <q-card dark>
        <q-bar>
          <div>{{ editingId ? 'Editar' : 'Nuevo' }} producto</div>
          <q-space /><q-btn flat dense icon="close" v-close-popup />
        </q-bar>
        <q-card-section class="q-gutter-md" style="max-width: 600px">
          <q-input v-model="form.name" label="Nombre" outlined dark />
          <q-input v-model="form.description" label="Descripción" outlined dark />
          <q-input v-model.number="form.price" label="Precio" type="number" outlined dark />
          <q-select v-model="form.categoryId" :options="categorias" option-value="id" option-label="name" emit-value map-options label="Categoría" outlined dark />
          <q-select v-model="form.printSector" :options="sectors" emit-value map-options label="Sector impresión" outlined dark />
          <q-toggle v-model="form.manualAvailable" label="Disponible manualmente" dark />

          <div class="text-subtitle2 q-mt-md">Receta (insumos de {{ form.categoryId === categoriaBebidas ? 'bebida' : 'cocina' }})</div>
          <div v-for="(line, idx) in form.recipe" :key="idx" class="row q-gutter-sm items-center">
            <q-select v-model="line.ingredientId" :options="insumosReceta" option-value="id" option-label="name" emit-value map-options label="Insumo" outlined dark class="col" />
            <q-input v-model.number="line.quantity" label="Cant." type="number" outlined dark style="width: 100px" />
            <q-btn flat icon="delete" color="negative" @click="form.recipe!.splice(idx, 1)" />
          </div>
          <q-btn flat icon="add" label="Agregar insumo" @click="addRecipeLine" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
