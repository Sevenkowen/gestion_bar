<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { menuApi, type MenuItemType, type MenuSection, type MenuItemForm } from '@/services/menu.api';
import { productosApi } from '@/services/productos.api';
import { combosApi } from '@/services/combos.api';
import { stockApi } from '@/services/stock.api';
import type { Product, Combo, Ingredient } from '@/types';
import { formatMoney } from '@/utils/format';

const $q = useQuasar();
const sections = ref<MenuSection[]>([]);
const productos = ref<Product[]>([]);
const combos = ref<Combo[]>([]);
const insumos = ref<Ingredient[]>([]);
const loading = ref(false);

const sectionDialog = ref(false);
const itemDialog = ref(false);
const editingSectionId = ref<number | null>(null);
const editingItemId = ref<number | null>(null);

const sectionForm = ref({ name: '', sortOrder: 0 });
const itemForm = ref<{
  sectionId: number;
  type: MenuItemType;
  refId: number | null;
  price: number;
  sortOrder: number;
  visible: boolean;
}>({
  sectionId: 0,
  type: 'PRODUCT',
  refId: null,
  price: 0,
  sortOrder: 0,
  visible: true,
});

const typeOptions = [
  { label: 'Producto', value: 'PRODUCT' },
  { label: 'Combo', value: 'COMBO' },
  { label: 'Insumo (bebida)', value: 'INSUMO' },
];

const refOptions = computed(() => {
  if (itemForm.value.type === 'PRODUCT') {
    return productos.value.map((p) => ({ label: p.name, value: p.id, price: Number(p.price) }));
  }
  if (itemForm.value.type === 'COMBO') {
    return combos.value.map((c) => ({ label: c.name, value: c.id, price: Number(c.price) }));
  }
  return insumos.value
    .filter((i) => i.kind === 'BEBIDA')
    .map((i) => ({ label: i.name, value: i.id, price: Number(i.cost) * 3 }));
});

function itemName(item: MenuSection['items'][0]) {
  return item.product?.name ?? item.combo?.name ?? item.ingredient?.name ?? '—';
}

function itemTypeLabel(type: MenuItemType) {
  if (type === 'PRODUCT') return 'Producto';
  if (type === 'COMBO') return 'Combo';
  return 'Insumo';
}

async function load() {
  loading.value = true;
  try {
    const [secs, prods, combs] = await Promise.all([
      menuApi.sections(),
      productosApi.list(),
      combosApi.list(),
    ]);
    sections.value = secs;
    productos.value = prods;
    combos.value = combs;
    insumos.value = await stockApi.ingredientes('BEBIDA');
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

function openCreateSection() {
  editingSectionId.value = null;
  sectionForm.value = { name: '', sortOrder: sections.value.length + 1 };
  sectionDialog.value = true;
}

function openEditSection(section: MenuSection) {
  editingSectionId.value = section.id;
  sectionForm.value = { name: section.name, sortOrder: section.sortOrder };
  sectionDialog.value = true;
}

async function saveSection() {
  try {
    if (editingSectionId.value) {
      await menuApi.updateSection(editingSectionId.value, sectionForm.value);
    } else {
      await menuApi.createSection(sectionForm.value);
    }
    sectionDialog.value = false;
    await load();
    $q.notify({ type: 'positive', message: 'Sección guardada' });
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar sección' });
  }
}

function removeSection(id: number) {
  $q.dialog({
    title: 'Eliminar sección',
    message: 'Se eliminarán también todos los ítems de esta sección.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      await menuApi.removeSection(id);
      await load();
    })();
  });
}

function openCreateItem(sectionId: number) {
  editingItemId.value = null;
  itemForm.value = {
    sectionId,
    type: 'PRODUCT',
    refId: null,
    price: 0,
    sortOrder: (sections.value.find((s) => s.id === sectionId)?.items.length ?? 0) + 1,
    visible: true,
  };
  itemDialog.value = true;
}

function openEditItem(item: MenuSection['items'][0]) {
  editingItemId.value = item.id;
  itemForm.value = {
    sectionId: item.section?.id ?? 0,
    type: item.type,
    refId: item.product?.id ?? item.combo?.id ?? item.ingredient?.id ?? null,
    price: Number(item.price),
    sortOrder: item.sortOrder,
    visible: item.visible,
  };
  itemDialog.value = true;
}

function onRefSelected(refId: number | null) {
  if (!refId || editingItemId.value) return;
  const opt = refOptions.value.find((o) => o.value === refId);
  if (opt) itemForm.value.price = opt.price;
}

function onTypeChanged() {
  itemForm.value.refId = null;
  itemForm.value.price = 0;
}

async function saveItem() {
  if (!itemForm.value.refId) {
    $q.notify({ type: 'warning', message: 'Seleccioná qué agregar al menú' });
    return;
  }
  try {
    if (editingItemId.value) {
      await menuApi.updateItem(editingItemId.value, {
        sectionId: itemForm.value.sectionId,
        price: itemForm.value.price,
        sortOrder: itemForm.value.sortOrder,
        visible: itemForm.value.visible,
      });
    } else {
      const payload: MenuItemForm = {
        sectionId: itemForm.value.sectionId,
        type: itemForm.value.type,
        price: itemForm.value.price,
        sortOrder: itemForm.value.sortOrder,
        visible: itemForm.value.visible,
      };
      if (itemForm.value.type === 'PRODUCT') payload.productId = itemForm.value.refId!;
      if (itemForm.value.type === 'COMBO') payload.comboId = itemForm.value.refId!;
      if (itemForm.value.type === 'INSUMO') payload.ingredientId = itemForm.value.refId!;
      await menuApi.createItem(payload);
    }
    itemDialog.value = false;
    await load();
    $q.notify({ type: 'positive', message: 'Ítem guardado' });
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar ítem' });
  }
}

async function removeItem(id: number) {
  await menuApi.removeItem(id);
  await load();
}

async function toggleVisible(item: MenuSection['items'][0]) {
  await menuApi.updateItem(item.id, { visible: !item.visible });
  await load();
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">Menú / Carta</div>
        <div class="text-caption text-grey-5">
          Armá qué ve el mozo. Podés usar productos, combos o insumos con precio propio.
        </div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nueva sección" @click="openCreateSection" />
    </div>

    <q-inner-loading :showing="loading" />

    <div v-if="!sections.length && !loading" class="text-center q-pa-xl text-grey-5">
      <q-icon name="restaurant_menu" size="64px" />
      <div class="q-mt-md">Todavía no hay secciones en el menú</div>
      <q-btn color="primary" label="Crear primera sección" class="q-mt-md" @click="openCreateSection" />
    </div>

    <div v-for="section in sections" :key="section.id" class="q-mb-lg">
      <q-card flat bordered class="bg-grey-10">
        <q-card-section class="row items-center">
          <div>
            <div class="text-h6">{{ section.name }}</div>
            <div class="text-caption text-grey-5">Orden {{ section.sortOrder }}</div>
          </div>
          <q-space />
          <q-badge v-if="!section.active" label="Inactiva" color="grey" class="q-mr-sm" />
          <q-btn flat dense icon="edit" @click="openEditSection(section)" />
          <q-btn flat dense icon="delete" color="negative" @click="removeSection(section.id)" />
          <q-btn flat dense icon="add" color="primary" label="Agregar ítem" @click="openCreateItem(section.id)" />
        </q-card-section>

        <q-separator />

        <q-list v-if="section.items.length" separator>
          <q-item v-for="item in section.items" :key="item.id">
            <q-item-section avatar>
              <q-badge :color="item.visible ? 'positive' : 'grey'" :label="itemTypeLabel(item.type)" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ itemName(item) }}</q-item-label>
              <q-item-label caption>Orden {{ item.sortOrder }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="text-amber text-weight-bold">{{ formatMoney(item.price) }}</div>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="item.visible"
                color="positive"
                @update:model-value="toggleVisible(item)"
              />
              <q-btn flat dense icon="edit" @click="openEditItem(item)" />
              <q-btn flat dense icon="delete" color="negative" @click="removeItem(item.id)" />
            </q-item-section>
          </q-item>
        </q-list>

        <q-card-section v-else class="text-grey-5 text-center">
          Sin ítems — agregá productos, combos o insumos
        </q-card-section>
      </q-card>
    </div>

    <!-- Dialog sección -->
    <q-dialog v-model="sectionDialog">
      <q-card dark style="min-width: 320px">
        <q-card-section class="text-h6">Sección del menú</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="sectionForm.name" label="Nombre (ej. Hamburguesas)" outlined dark />
          <q-input v-model.number="sectionForm.sortOrder" type="number" label="Orden" outlined dark />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" @click="saveSection" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog ítem -->
    <q-dialog v-model="itemDialog">
      <q-card dark style="min-width: 360px">
        <q-card-section class="text-h6">
          {{ editingItemId ? 'Editar ítem' : 'Agregar al menú' }}
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-if="!editingItemId"
            v-model="itemForm.type"
            :options="typeOptions"
            emit-value
            map-options
            label="Tipo"
            outlined
            dark
            @update:model-value="onTypeChanged"
          />
          <q-select
            v-if="!editingItemId"
            v-model="itemForm.refId"
            :options="refOptions"
            emit-value
            map-options
            label="Seleccionar"
            outlined
            dark
            @update:model-value="onRefSelected"
          />
          <q-input
            v-model.number="itemForm.price"
            type="number"
            label="Precio en menú"
            prefix="$"
            outlined
            dark
            hint="Puede ser distinto al precio del catálogo"
          />
          <q-input v-model.number="itemForm.sortOrder" type="number" label="Orden" outlined dark />
          <q-toggle v-model="itemForm.visible" label="Visible en carta" color="positive" dark />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Guardar" @click="saveItem" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
