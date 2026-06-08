<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { combosApi, type ComboForm } from '@/services/combos.api';
import { productosApi } from '@/services/productos.api';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import BarGoldBtn from '@/components/admin/BarGoldBtn.vue';
import { useAdaptiveTableRows } from '@/composables/useAdaptiveTableRows';
import type { Combo, Product } from '@/types';

const $q = useQuasar();
const combos = ref<Combo[]>([]);
const productos = ref<Product[]>([]);
const search = ref('');
const searchFilter = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
const loading = ref(false);
const dialog = ref(false);
const editingId = ref<number | null>(null);
const productSearch = ref('');
const page = ref(1);
const tableBodyRef = ref<HTMLElement | null>(null);
const tableFooterRef = ref<HTMLElement | null>(null);

const { rowsPerPage, recalculate: recalculateRows } = useAdaptiveTableRows(tableBodyRef, {
  footerRef: tableFooterRef,
  maxRows: 15,
  watchSources: [loading],
});

const form = ref<ComboForm>({ name: '', description: '', price: 0, products: [] });

const productCatalog = computed(() => {
  const q = productSearch.value.trim().toLowerCase();
  const inCombo = new Set(form.value.products.map((line) => line.productId));
  return productos.value.filter((p) => {
    if (inCombo.has(p.id)) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q);
  });
});

const filteredCombos = computed(() => {
  const q = searchFilter.value.trim().toLowerCase();
  if (!q) return combos.value;
  return combos.value.filter((c) => {
    const items = c.products.map((p) => p.product.name).join(' ').toLowerCase();
    const price = formatPrice(c.price).toLowerCase();
    return c.name.toLowerCase().includes(q) || items.includes(q) || price.includes(q);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCombos.value.length / rowsPerPage.value)));

const paginatedCombos = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredCombos.value.slice(start, start + rowsPerPage.value);
});

const pageInfo = computed(() => {
  const total = filteredCombos.value.length;
  if (total === 0) return { from: 0, to: 0, total: 0 };
  const from = (page.value - 1) * rowsPerPage.value + 1;
  const to = Math.min(page.value * rowsPerPage.value, total);
  return { from, to, total };
});

const visiblePages = computed(() => {
  const pages = totalPages.value;
  if (pages <= 6) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page.value <= 4) return [1, 2, 3, 4, 5];
  if (page.value >= pages - 2) return [pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [page.value - 1, page.value, page.value + 1];
});

const showPaginationEllipsis = computed(() => {
  const pages = totalPages.value;
  if (pages <= 6) return false;
  const lastVisible = visiblePages.value[visiblePages.value.length - 1] ?? 0;
  return lastVisible < pages - 1;
});

const showLastPage = computed(() => {
  const pages = totalPages.value;
  if (pages <= 6) return false;
  return !visiblePages.value.includes(pages);
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

watch(searchFilter, () => {
  page.value = 1;
});

watch(totalPages, (pages) => {
  if (page.value > pages) page.value = pages;
});

watch(rowsPerPage, () => {
  if (page.value > totalPages.value) page.value = totalPages.value;
  void nextTick(recalculateRows);
});

watch(() => paginatedCombos.value.length, () => void nextTick(recalculateRows));

function clearSearch() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  search.value = '';
  searchFilter.value = '';
}

function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `$ ${formatted}`;
}

function comboProductsLabel(combo: Combo): string {
  if (!combo.products.length) return '—';
  return combo.products.map((p) => `${p.product.name} ×${p.quantity}`).join(', ');
}

function productName(id: number) {
  return productos.value.find((p) => p.id === id)?.name ?? 'Producto';
}

async function load() {
  loading.value = true;
  try {
    [combos.value, productos.value] = await Promise.all([combosApi.list(), productosApi.list()]);
  } finally {
    loading.value = false;
    await nextTick();
    recalculateRows();
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  productSearch.value = '';
  form.value = { name: '', description: '', price: 0, products: [] };
  dialog.value = true;
}

function openEdit(c: Combo) {
  editingId.value = c.id;
  productSearch.value = '';
  form.value = {
    name: c.name,
    description: c.description ?? '',
    price: parseFloat(c.price),
    products: c.products.map((p) => ({ productId: p.productId, quantity: p.quantity })),
  };
  dialog.value = true;
}

function addToCombo(productId: number) {
  const existing = form.value.products.find((line) => line.productId === productId);
  if (existing) {
    existing.quantity += 1;
    return;
  }
  form.value.products.push({ productId, quantity: 1 });
}

function removeFromCombo(productId: number) {
  form.value.products = form.value.products.filter((line) => line.productId !== productId);
}

function updateComboQty(productId: number, quantity: number) {
  const line = form.value.products.find((l) => l.productId === productId);
  if (!line) return;
  line.quantity = Math.max(1, Math.round(quantity));
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) page.value = p;
}

function onPriceFocus(event: Event) {
  if (Number(form.value.price) !== 0) return;
  form.value.price = null as unknown as number;
  void nextTick(() => {
    const input = event.target as HTMLInputElement | null;
    if (input) input.value = '';
  });
}

function onPriceBlur() {
  const raw = form.value.price;
  if (raw === null || raw === undefined || raw === ('' as unknown as number) || Number.isNaN(Number(raw))) {
    form.value.price = 0;
  }
}

async function save() {
  try {
    if (editingId.value) {
      await combosApi.update(editingId.value, form.value);
    } else {
      await combosApi.create(form.value);
    }
    $q.notify({ type: 'positive', message: 'Combo guardado' });
    dialog.value = false;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error al guardar combo' });
  }
}

function remove(id: number) {
  $q.dialog({ title: 'Eliminar', message: '¿Desactivar este combo?', cancel: true }).onOk(() => {
    void combosApi.remove(id).then(() => load());
  });
}
</script>

<template>
  <q-page class="q-pa-md admin-page fit combos-page">
    <div class="admin-page__header">
      <div class="admin-module-page__title-row">
        <AdminPageTitle title="Combos" font="chairdrobe" />
        <BarGoldBtn class="admin-module-page__cta" icon="add" label="Nuevo combo" @click="openCreate" />
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        clearable
        placeholder="Buscar combo..."
        class="bar-search q-mb-md"
        @clear="clearSearch"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <div ref="tableBodyRef" class="admin-page__body">
      <div class="bar-table-shell">
        <q-table
          class="admin-page__table bar-table bar-table--fit"
          flat
          dark
          :rows="paginatedCombos"
          row-key="id"
          :loading="loading"
          hide-pagination
          :pagination="{ rowsPerPage: rowsPerPage }"
          :columns="[
            { name: 'name', label: 'Combo', field: 'name', align: 'left' },
            { name: 'price', label: 'Precio', field: 'price', align: 'right' },
            { name: 'items', label: 'Productos', field: 'id', align: 'left' },
            { name: 'actions', label: 'Acciones', field: 'id', align: 'right' },
          ]"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="bar-table__name">{{ props.row.name }}</q-td>
          </template>
          <template #body-cell-price="props">
            <q-td :props="props" class="text-price">{{ formatPrice(props.row.price) }}</q-td>
          </template>
          <template #body-cell-items="props">
            <q-td :props="props" class="bar-table__muted">{{ comboProductsLabel(props.row) }}</q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat dense round icon="edit" class="bar-action-btn" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="delete_outline" class="bar-action-btn" @click="remove(props.row.id)">
                <q-tooltip>Desactivar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>
          <template #no-data>
            <div class="full-width text-center text-grey-5 q-pa-lg">
              {{ searchFilter ? 'Ningún combo coincide con la búsqueda' : 'No hay combos cargados' }}
            </div>
          </template>
        </q-table>
      </div>

      <div
        v-if="filteredCombos.length"
        ref="tableFooterRef"
        class="bar-table-footer row items-center justify-between"
      >
        <span>
          Mostrando {{ pageInfo.from }} a {{ pageInfo.to }} de {{ pageInfo.total }} combos
        </span>
        <div v-if="totalPages > 1" class="bar-pagination row items-center no-wrap q-gutter-xs">
          <button type="button" class="bar-pagination__arrow" :disabled="page <= 1" @click="goToPage(page - 1)">
            ‹
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            type="button"
            class="bar-pagination__page"
            :class="{ 'bar-pagination__page--active': p === page }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <span v-if="showPaginationEllipsis" class="bar-pagination__dots">…</span>
          <button
            v-if="showLastPage"
            type="button"
            class="bar-pagination__page"
            :class="{ 'bar-pagination__page--active': page === totalPages }"
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>
          <button
            type="button"
            class="bar-pagination__arrow"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >
            ›
          </button>
        </div>
      </div>
    </div>

    <q-dialog v-model="dialog">
      <q-card flat bordered dark class="login-card productos-dialog">
        <q-card-section class="productos-dialog__header">
          <span class="productos-dialog__header-title bar-page-title__text">
            {{ editingId ? 'Editar combo' : 'Nuevo combo' }}
          </span>
          <q-btn
            flat
            dense
            round
            icon="close"
            aria-label="Cerrar"
            class="productos-dialog__close"
            v-close-popup
          />
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-section class="productos-dialog__fields">
          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="combo-nombre">Nombre combo</label>
            <q-input
              id="combo-nombre"
              v-model="form.name"
              dense
              outlined
              dark
              hide-bottom-space
              class="productos-dialog__field"
            />
          </div>

          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="combo-descripcion">Descripción</label>
            <q-input
              id="combo-descripcion"
              v-model="form.description"
              dense
              outlined
              dark
              hide-bottom-space
              type="textarea"
              autogrow
              :rows="2"
              class="productos-dialog__field productos-dialog__field--textarea"
            />
          </div>

          <div class="productos-dialog__fields-inline">
            <div class="productos-dialog__field-block productos-dialog__field-block--price">
              <label class="productos-dialog__label" for="combo-precio">Precio</label>
              <q-input
                id="combo-precio"
                v-model.number="form.price"
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
          </div>
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-section class="productos-dialog__split-section">
          <div class="productos-dialog__split">
            <div class="productos-dialog__split-col productos-dialog__catalog">
              <div class="productos-dialog__split-head">Productos</div>

              <q-input
                v-model="productSearch"
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
                  v-for="product in productCatalog"
                  :key="product.id"
                  type="button"
                  class="productos-dialog__catalog-item"
                  @click="addToCombo(product.id)"
                >
                  <span class="productos-dialog__catalog-name">{{ product.name }}</span>
                  <span class="productos-dialog__catalog-add">+</span>
                </button>
                <div v-if="!productCatalog.length" class="productos-dialog__empty">
                  {{ productSearch ? 'Sin resultados' : 'Sin productos disponibles' }}
                </div>
              </div>
            </div>

            <div class="productos-dialog__split-col productos-dialog__cart">
              <div class="productos-dialog__split-head">Combo</div>

              <div class="productos-dialog__cart-scroll">
                <div
                  v-for="line in form.products"
                  :key="line.productId"
                  class="productos-dialog__recipe-line"
                >
                  <span class="productos-dialog__recipe-name">{{ productName(line.productId) }}</span>
                  <span class="productos-dialog__recipe-leader" aria-hidden="true" />
                  <div class="productos-dialog__recipe-qty">
                    <q-input
                      :model-value="line.quantity"
                      dense
                      outlined
                      dark
                      hide-bottom-space
                      type="number"
                      min="1"
                      step="1"
                      class="productos-dialog__qty"
                      @update:model-value="(v) => updateComboQty(line.productId, Number(v))"
                    />
                    <span class="productos-dialog__recipe-unit">u.</span>
                  </div>
                  <q-btn
                    flat
                    round
                    dense
                    icon="close"
                    size="sm"
                    class="bar-action-btn productos-dialog__cart-remove"
                    @click="removeFromCombo(line.productId)"
                  />
                </div>
                <div v-if="!form.products.length" class="productos-dialog__empty">
                  Agregá productos desde la lista
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-actions align="right" class="productos-dialog__actions">
          <q-btn flat label="Cancelar" v-close-popup color="grey-5" />
          <BarGoldBtn label="Guardar" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
