<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { menuApi, type MenuItemType, type MenuSection, type MenuItemForm } from '@/services/menu.api';
import { productosApi } from '@/services/productos.api';
import { combosApi } from '@/services/combos.api';
import { stockApi } from '@/services/stock.api';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import BarGoldBtn from '@/components/admin/BarGoldBtn.vue';
import type { Product, Combo, Ingredient } from '@/types';

const $q = useQuasar();
const sections = ref<MenuSection[]>([]);
const productos = ref<Product[]>([]);
const combos = ref<Combo[]>([]);
const insumos = ref<Ingredient[]>([]);
const loading = ref(false);
const search = ref('');
const searchFilter = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

const sectionDialog = ref(false);
const itemDialog = ref(false);
const editingSectionId = ref<number | null>(null);
const editingItemId = ref<number | null>(null);
const refSearch = ref('');

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

const refCatalog = computed(() => {
  const q = refSearch.value.trim().toLowerCase();
  return refOptions.value.filter((opt) => !q || opt.label.toLowerCase().includes(q));
});

const selectedRefLabel = computed(() => {
  if (!itemForm.value.refId) return null;
  return refOptions.value.find((o) => o.value === itemForm.value.refId)?.label ?? null;
});

const filteredSections = computed(() => {
  const q = searchFilter.value.trim().toLowerCase();
  if (!q) return sections.value;
  return sections.value
    .map((section) => {
      const nameMatch = section.name.toLowerCase().includes(q);
      const filteredItems = section.items.filter(
        (item) =>
          itemName(item).toLowerCase().includes(q) ||
          itemTypeLabel(item.type).toLowerCase().includes(q),
      );
      if (nameMatch) return section;
      if (filteredItems.length) return { ...section, items: filteredItems };
      return null;
    })
    .filter((s): s is MenuSection => s != null);
});

watch(search, (val) => {
  if (val == null) {
    clearSearch();
    return;
  }
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchFilter.value = val;
  }, 200);
}, { immediate: true });

function clearSearch() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  search.value = '';
  searchFilter.value = '';
}

function itemName(item: MenuSection['items'][0]) {
  return item.product?.name ?? item.combo?.name ?? item.ingredient?.name ?? '—';
}

function itemTypeLabel(type: MenuItemType) {
  if (type === 'PRODUCT') return 'Producto';
  if (type === 'COMBO') return 'Combo';
  return 'Insumo';
}

function typeBadgeClass(type: MenuItemType) {
  if (type === 'COMBO') return 'bar-tag--accent';
  if (type === 'INSUMO') return 'bar-tag--accent';
  return 'bar-tag--cocina';
}

function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `$ ${formatted}`;
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
  }).onOk(() => {
    void menuApi.removeSection(id).then(() => load());
  });
}

function openCreateItem(sectionId: number) {
  editingItemId.value = null;
  refSearch.value = '';
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
  refSearch.value = '';
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

function selectRef(refId: number) {
  itemForm.value.refId = refId;
  const opt = refOptions.value.find((o) => o.value === refId);
  if (opt && !editingItemId.value) itemForm.value.price = opt.price;
}

function onTypeChanged() {
  itemForm.value.refId = null;
  itemForm.value.price = 0;
  refSearch.value = '';
}

function onPriceFocus(event: Event) {
  if (Number(itemForm.value.price) !== 0) return;
  itemForm.value.price = null as unknown as number;
  void nextTick(() => {
    const input = event.target as HTMLInputElement | null;
    if (input) input.value = '';
  });
}

function onPriceBlur() {
  const raw = itemForm.value.price;
  if (raw === null || raw === undefined || raw === ('' as unknown as number) || Number.isNaN(Number(raw))) {
    itemForm.value.price = 0;
  }
}

async function saveItem() {
  if (!itemForm.value.refId && !editingItemId.value) {
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

function removeItem(id: number) {
  $q.dialog({ title: 'Eliminar', message: '¿Quitar este ítem del menú?', cancel: true }).onOk(() => {
    void menuApi.removeItem(id).then(() => load());
  });
}

async function toggleVisible(item: MenuSection['items'][0]) {
  await menuApi.updateItem(item.id, { visible: !item.visible });
  await load();
}
</script>

<template>
  <q-page class="q-pa-md admin-page fit menu-page">
    <div class="admin-page__header">
      <div class="admin-module-page__title-row">
        <AdminPageTitle title="Menú / Carta" font="chairdrobe" />
        <BarGoldBtn class="admin-module-page__cta" icon="add" label="Nueva sección" @click="openCreateSection" />
      </div>

      <p class="menu-page__subtitle">
        Armá qué ve el mozo. Podés usar productos, combos o insumos con precio propio.
      </p>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        clearable
        placeholder="Buscar sección o ítem..."
        class="bar-search q-mb-md"
        @clear="clearSearch"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <div class="admin-page__body menu-page__body">
      <q-inner-loading :showing="loading" color="primary" />

      <div v-if="!sections.length && !loading" class="menu-page__empty">
        <q-icon name="restaurant_menu" size="48px" class="menu-page__empty-icon" />
        <p>Todavía no hay secciones en el menú</p>
        <BarGoldBtn label="Crear primera sección" @click="openCreateSection" />
      </div>

      <div v-else-if="!filteredSections.length && !loading" class="menu-page__empty">
        <p>Ninguna sección o ítem coincide con la búsqueda</p>
      </div>

      <div v-for="section in filteredSections" :key="section.id" class="menu-page__section bar-table-shell">
        <div class="menu-page__section-head">
          <div class="menu-page__section-info">
            <h2 class="menu-page__section-title">{{ section.name }}</h2>
            <span class="menu-page__section-meta">Orden {{ section.sortOrder }}</span>
            <span v-if="!section.active" class="bar-tag bar-tag--muted">Inactiva</span>
          </div>
          <div class="menu-page__section-actions">
            <q-btn flat dense round icon="edit" class="bar-action-btn" @click="openEditSection(section)">
              <q-tooltip>Editar sección</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete_outline" class="bar-action-btn" @click="removeSection(section.id)">
              <q-tooltip>Eliminar sección</q-tooltip>
            </q-btn>
            <BarGoldBtn icon="add" label="Agregar ítem" @click="openCreateItem(section.id)" />
          </div>
        </div>

        <q-table
          v-if="section.items.length"
          class="bar-table menu-page__items-table"
          flat
          dark
          :rows="section.items"
          row-key="id"
          hide-pagination
          :pagination="{ rowsPerPage: 0 }"
          :columns="[
            { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
            { name: 'name', label: 'Ítem', field: 'id', align: 'left' },
            { name: 'order', label: 'Orden', field: 'sortOrder', align: 'center' },
            { name: 'price', label: 'Precio', field: 'price', align: 'right' },
            { name: 'visible', label: 'Visible', field: 'visible', align: 'center' },
            { name: 'actions', label: 'Acciones', field: 'id', align: 'right' },
          ]"
        >
          <template #body-cell-type="props">
            <q-td :props="props">
              <span class="bar-tag" :class="typeBadgeClass(props.row.type)">
                {{ itemTypeLabel(props.row.type) }}
              </span>
            </q-td>
          </template>
          <template #body-cell-name="props">
            <q-td :props="props" class="bar-table__name">{{ itemName(props.row) }}</q-td>
          </template>
          <template #body-cell-order="props">
            <q-td :props="props" class="bar-table__muted">{{ props.row.sortOrder }}</q-td>
          </template>
          <template #body-cell-price="props">
            <q-td :props="props" class="text-price">{{ formatPrice(props.row.price) }}</q-td>
          </template>
          <template #body-cell-visible="props">
            <q-td :props="props">
              <q-toggle
                :model-value="props.row.visible"
                dense
                dark
                class="menu-page__visible-toggle"
                @update:model-value="toggleVisible(props.row)"
              />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat dense round icon="edit" class="bar-action-btn" @click="openEditItem(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="delete_outline" class="bar-action-btn" @click="removeItem(props.row.id)">
                <q-tooltip>Quitar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div v-else class="menu-page__section-empty">
          Sin ítems — agregá productos, combos o insumos
        </div>
      </div>
    </div>

    <!-- Dialog sección -->
    <q-dialog v-model="sectionDialog">
      <q-card flat bordered dark class="login-card productos-dialog productos-dialog--compact">
        <q-card-section class="productos-dialog__header">
          <span class="productos-dialog__header-title bar-page-title__text">
            {{ editingSectionId ? 'Editar sección' : 'Nueva sección' }}
          </span>
          <q-btn flat dense round icon="close" aria-label="Cerrar" class="productos-dialog__close" v-close-popup />
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-section class="productos-dialog__fields">
          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="section-nombre">Nombre</label>
            <q-input
              id="section-nombre"
              v-model="sectionForm.name"
              dense
              outlined
              dark
              hide-bottom-space
              placeholder="Ej. Hamburguesas"
              class="productos-dialog__field"
            />
          </div>

          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="section-orden">Orden</label>
            <q-input
              id="section-orden"
              v-model.number="sectionForm.sortOrder"
              dense
              outlined
              dark
              hide-bottom-space
              type="number"
              min="0"
              step="1"
              class="productos-dialog__field"
            />
          </div>
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-actions align="right" class="productos-dialog__actions">
          <q-btn flat label="Cancelar" v-close-popup color="grey-5" />
          <BarGoldBtn label="Guardar" @click="saveSection" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog ítem -->
    <q-dialog v-model="itemDialog">
      <q-card flat bordered dark class="login-card productos-dialog" :class="{ 'productos-dialog--compact': !!editingItemId }">
        <q-card-section class="productos-dialog__header">
          <span class="productos-dialog__header-title bar-page-title__text">
            {{ editingItemId ? 'Editar ítem' : 'Agregar al menú' }}
          </span>
          <q-btn flat dense round icon="close" aria-label="Cerrar" class="productos-dialog__close" v-close-popup />
        </q-card-section>

        <div class="productos-dialog__rule" />

        <template v-if="editingItemId">
          <q-card-section class="productos-dialog__fields">
            <div class="productos-dialog__field-block">
              <span class="productos-dialog__label">Ítem</span>
              <div class="menu-page__readonly-value">{{ selectedRefLabel ?? '—' }}</div>
            </div>

            <div class="productos-dialog__fields-inline">
              <div class="productos-dialog__field-block productos-dialog__field-block--price">
                <label class="productos-dialog__label" for="item-precio">Precio en menú</label>
                <q-input
                  id="item-precio"
                  v-model.number="itemForm.price"
                  dense
                  outlined
                  dark
                  hide-bottom-space
                  type="number"
                  min="0"
                  step="0.01"
                  class="productos-dialog__field productos-dialog__field--price"
                  @focus="onPriceFocus"
                  @blur="onPriceBlur"
                >
                  <template #prepend>
                    <span class="productos-dialog__price-prefix">$</span>
                  </template>
                </q-input>
              </div>

              <div class="productos-dialog__field-block productos-dialog__field-block--price">
                <label class="productos-dialog__label" for="item-orden">Orden</label>
                <q-input
                  id="item-orden"
                  v-model.number="itemForm.sortOrder"
                  dense
                  outlined
                  dark
                  hide-bottom-space
                  type="number"
                  min="0"
                  step="1"
                  class="productos-dialog__field"
                />
              </div>

              <div class="productos-dialog__field-block productos-dialog__field-block--toggle">
                <span class="productos-dialog__label">Visible</span>
                <div class="productos-dialog__toggle-row">
                  <q-toggle v-model="itemForm.visible" dense dark class="productos-dialog__toggle" />
                  <span class="productos-dialog__toggle-state">{{ itemForm.visible ? 'ON' : 'OFF' }}</span>
                </div>
              </div>
            </div>
          </q-card-section>
        </template>

        <template v-else>
          <q-card-section class="productos-dialog__fields">
            <div class="productos-dialog__field-block productos-dialog__field-block--grow">
              <label class="productos-dialog__label">Tipo</label>
              <q-select
                v-model="itemForm.type"
                dense
                options-dense
                outlined
                dark
                hide-bottom-space
                popup-content-class="bar-select-menu"
                :options="typeOptions"
                emit-value
                map-options
                class="productos-dialog__field"
                @update:model-value="onTypeChanged"
              />
            </div>
          </q-card-section>

          <div class="productos-dialog__rule" />

          <q-card-section class="productos-dialog__split-section">
            <div class="productos-dialog__split">
              <div class="productos-dialog__split-col productos-dialog__catalog">
                <div class="productos-dialog__split-head">Catálogo</div>

                <q-input
                  v-model="refSearch"
                  dense
                  outlined
                  dark
                  hide-bottom-space
                  clearable
                  placeholder="Buscar"
                  class="productos-dialog__field productos-dialog__catalog-search"
                >
                  <template #prepend>
                    <q-icon name="search" size="16px" />
                  </template>
                </q-input>

                <div class="productos-dialog__catalog-scroll">
                  <button
                    v-for="opt in refCatalog"
                    :key="opt.value"
                    type="button"
                    class="productos-dialog__catalog-item"
                    :class="{ 'productos-dialog__catalog-item--active': itemForm.refId === opt.value }"
                    @click="selectRef(opt.value)"
                  >
                    <span class="productos-dialog__catalog-name">{{ opt.label }}</span>
                    <span class="productos-dialog__catalog-add">{{ itemForm.refId === opt.value ? '✓' : '+' }}</span>
                  </button>
                  <div v-if="!refCatalog.length" class="productos-dialog__empty">
                    {{ refSearch ? 'Sin resultados' : 'Sin opciones para este tipo' }}
                  </div>
                </div>
              </div>

              <div class="productos-dialog__split-col productos-dialog__cart">
                <div class="productos-dialog__split-head">Seleccionado</div>

                <div class="productos-dialog__cart-scroll menu-page__item-form">
                  <div v-if="selectedRefLabel" class="menu-page__selected-name">{{ selectedRefLabel }}</div>
                  <div v-else class="productos-dialog__empty">Elegí un ítem del catálogo</div>

                  <template v-if="itemForm.refId">
                    <div class="productos-dialog__field-block productos-dialog__field-block--price menu-page__item-field">
                      <label class="productos-dialog__label">Precio en menú</label>
                      <q-input
                        v-model.number="itemForm.price"
                        dense
                        outlined
                        dark
                        hide-bottom-space
                        type="number"
                        min="0"
                        step="0.01"
                        class="productos-dialog__field productos-dialog__field--price"
                        @focus="onPriceFocus"
                        @blur="onPriceBlur"
                      >
                        <template #prepend>
                          <span class="productos-dialog__price-prefix">$</span>
                        </template>
                      </q-input>
                    </div>

                    <div class="productos-dialog__field-block productos-dialog__field-block--price menu-page__item-field">
                      <label class="productos-dialog__label">Orden</label>
                      <q-input
                        v-model.number="itemForm.sortOrder"
                        dense
                        outlined
                        dark
                        hide-bottom-space
                        type="number"
                        min="0"
                        step="1"
                        class="productos-dialog__field"
                      />
                    </div>

                    <div class="productos-dialog__field-block productos-dialog__field-block--toggle menu-page__item-field">
                      <span class="productos-dialog__label">Visible</span>
                      <div class="productos-dialog__toggle-row">
                        <q-toggle v-model="itemForm.visible" dense dark class="productos-dialog__toggle" />
                        <span class="productos-dialog__toggle-state">{{ itemForm.visible ? 'ON' : 'OFF' }}</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </q-card-section>
        </template>

        <div class="productos-dialog__rule" />

        <q-card-actions align="right" class="productos-dialog__actions">
          <q-btn flat label="Cancelar" v-close-popup color="grey-5" />
          <BarGoldBtn label="Guardar" @click="saveItem" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
