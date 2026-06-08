<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { productosApi, type ProductForm } from '@/services/productos.api';
import { categoriasApi } from '@/services/categorias.api';
import { stockApi } from '@/services/stock.api';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import BarGoldBtn from '@/components/admin/BarGoldBtn.vue';
import { useAdaptiveTableRows } from '@/composables/useAdaptiveTableRows';
import type { Product, Category, Ingredient, PrintSector } from '@/types';

const $q = useQuasar();
const productos = ref<Product[]>([]);
const categorias = ref<Category[]>([]);
const insumos = ref<Ingredient[]>([]);
const search = ref('');
const searchFilter = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
const loading = ref(false);
const dialog = ref(false);
const editingId = ref<number | null>(null);
const recipeSearch = ref('');
const page = ref(1);
const tableBodyRef = ref<HTMLElement | null>(null);
const tableFooterRef = ref<HTMLElement | null>(null);

const { rowsPerPage, recalculate: recalculateRows } = useAdaptiveTableRows(tableBodyRef, {
  footerRef: tableFooterRef,
  maxRows: 15,
  watchSources: [loading],
});

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

const insumosReceta = computed(() => {
  const isBebida = form.value.categoryId === categoriaBebidas.value;
  return insumos.value.filter((i) => {
    const kind = i.kind ?? 'COCINA';
    return isBebida ? kind === 'BEBIDA' : kind === 'COCINA';
  });
});

const recipeCatalog = computed(() => {
  const q = recipeSearch.value.trim().toLowerCase();
  const inRecipe = new Set((form.value.recipe ?? []).map((line) => line.ingredientId));
  return insumosReceta.value.filter((ing) => {
    if (inRecipe.has(ing.id)) return false;
    if (!q) return true;
    return ing.name.toLowerCase().includes(q) || ing.unit.toLowerCase().includes(q);
  });
});

function ingredientName(id: number) {
  return insumos.value.find((i) => i.id === id)?.name ?? 'Insumo';
}

function ingredientUnit(id: number) {
  return insumos.value.find((i) => i.id === id)?.unit ?? '';
}

watch(
  () => form.value.categoryId,
  () => {
    const validIds = new Set(insumosReceta.value.map((i) => i.id));
    form.value.recipe = (form.value.recipe ?? []).filter((line) => validIds.has(line.ingredientId));
  },
);

const filteredProductos = computed(() => {
  const q = searchFilter.value.trim().toLowerCase();
  if (!q) return productos.value;
  return productos.value.filter((p) => {
    const cat = p.category?.name?.toLowerCase() ?? '';
    const sector = sectorLabel(p.printSector).toLowerCase();
    const price = formatPrice(p.price).toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      cat.includes(q) ||
      sector.includes(q) ||
      price.includes(q)
    );
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProductos.value.length / rowsPerPage.value)));

const paginatedProductos = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredProductos.value.slice(start, start + rowsPerPage.value);
});

const pageInfo = computed(() => {
  const total = filteredProductos.value.length;
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

function clearSearch() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  search.value = '';
  searchFilter.value = '';
}

watch(totalPages, (pages) => {
  if (page.value > pages) page.value = pages;
});

watch(rowsPerPage, () => {
  if (page.value > totalPages.value) page.value = totalPages.value;
  void nextTick(recalculateRows);
});

watch(() => paginatedProductos.value.length, () => void nextTick(recalculateRows));

function sectorLabel(sector: PrintSector) {
  return sectors.find((s) => s.value === sector)?.label ?? sector;
}

function categoryBadge(product: Product): { label: string; class: string } {
  const label = product.category?.name ?? '-';
  if (product.categoryId === categoriaBebidas.value || label.toLowerCase() === 'bebidas') {
    return { label, class: 'bar-tag--accent' };
  }
  return { label, class: 'bar-tag--cocina' };
}

function sectorBadge(sector: PrintSector): { label: string; class: string } {
  const label = sectorLabel(sector);
  if (sector === 'BARRA') return { label, class: 'bar-tag--accent' };
  return { label, class: 'bar-tag--cocina' };
}

function isAvailable(product: Product) {
  return product.manualAvailable && product.autoAvailable;
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
    [productos.value, categorias.value, insumos.value] = await Promise.all([
      productosApi.list(),
      categoriasApi.list(),
      stockApi.ingredientes(),
    ]);
  } finally {
    loading.value = false;
    await nextTick();
    recalculateRows();
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  recipeSearch.value = '';
  form.value = { ...emptyForm(), categoryId: categorias.value[0]?.id ?? 0 };
  dialog.value = true;
}

function openEdit(p: Product) {
  editingId.value = p.id;
  recipeSearch.value = '';
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

function addToRecipe(ingredientId: number) {
  if (!form.value.recipe) form.value.recipe = [];
  const existing = form.value.recipe.find((line) => line.ingredientId === ingredientId);
  if (existing) {
    existing.quantity += 1;
    return;
  }
  form.value.recipe.push({ ingredientId, quantity: 1 });
}

function removeFromRecipe(ingredientId: number) {
  form.value.recipe = (form.value.recipe ?? []).filter((line) => line.ingredientId !== ingredientId);
}

function updateRecipeQty(ingredientId: number, quantity: number) {
  const line = form.value.recipe?.find((l) => l.ingredientId === ingredientId);
  if (!line) return;
  line.quantity = Math.max(0.01, quantity);
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
  <q-page class="q-pa-md admin-page fit productos-page">
    <div class="admin-page__header">
      <div class="admin-module-page__title-row">
        <AdminPageTitle title="Productos" font="chairdrobe" />
        <BarGoldBtn class="admin-module-page__cta" icon="add" label="Nuevo producto" @click="openCreate" />
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        clearable
        placeholder="Buscar producto..."
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
          :rows="paginatedProductos"
          row-key="id"
          :loading="loading"
          hide-pagination
          :pagination="{ rowsPerPage: rowsPerPage }"
          :columns="[
            { name: 'name', label: 'Producto', field: 'name', align: 'left' },
            { name: 'category', label: 'Categoría', field: (r: Product) => r.category?.name ?? '-', align: 'left' },
            { name: 'price', label: 'Precio', field: 'price', align: 'right' },
            { name: 'sector', label: 'Impresión', field: 'printSector', align: 'left' },
            { name: 'available', label: 'Disponible', field: 'id', align: 'center' },
            { name: 'actions', label: 'Acciones', field: 'id', align: 'right' },
          ]"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="bar-table__name">{{ props.row.name }}</q-td>
          </template>
          <template #body-cell-category="props">
            <q-td :props="props">
              <span class="bar-tag" :class="categoryBadge(props.row).class">
                {{ categoryBadge(props.row).label }}
              </span>
            </q-td>
          </template>
          <template #body-cell-price="props">
            <q-td :props="props" class="text-price">{{ formatPrice(props.row.price) }}</q-td>
          </template>
          <template #body-cell-sector="props">
            <q-td :props="props">
              <span class="bar-tag" :class="sectorBadge(props.row.printSector).class">
                {{ sectorBadge(props.row.printSector).label }}
              </span>
            </q-td>
          </template>
          <template #body-cell-available="props">
            <q-td :props="props">
              <span
                class="bar-stock-pill"
                :class="isAvailable(props.row) ? 'bar-stock-pill--ok' : 'bar-stock-pill--low'"
              >
                {{ isAvailable(props.row) ? 'Sí' : 'No' }}
              </span>
            </q-td>
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
              {{ searchFilter ? 'Ningún producto coincide con la búsqueda' : 'No hay productos cargados' }}
            </div>
          </template>
        </q-table>
      </div>

      <div
        v-if="filteredProductos.length"
        ref="tableFooterRef"
        class="bar-table-footer row items-center justify-between"
      >
        <span>
          Mostrando {{ pageInfo.from }} a {{ pageInfo.to }} de {{ pageInfo.total }} productos
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
            {{ editingId ? 'Editar producto' : 'Nuevo producto' }}
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
            <label class="productos-dialog__label" for="producto-nombre">Nombre producto</label>
            <q-input
              id="producto-nombre"
              v-model="form.name"
              dense
              outlined
              dark
              hide-bottom-space
              class="productos-dialog__field"
            />
          </div>

          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="producto-descripcion">Descripción</label>
            <q-input
              id="producto-descripcion"
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
              <label class="productos-dialog__label" for="producto-precio">Precio</label>
              <q-input
                id="producto-precio"
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

            <div class="productos-dialog__field-block productos-dialog__field-block--grow">
              <label class="productos-dialog__label">Categoría</label>
              <q-select
                v-model="form.categoryId"
                dense
                options-dense
                outlined
                dark
                hide-bottom-space
                popup-content-class="bar-select-menu"
                :options="categorias"
                option-value="id"
                option-label="name"
                emit-value
                map-options
                class="productos-dialog__field"
              />
            </div>

            <div class="productos-dialog__field-block productos-dialog__field-block--grow">
              <label class="productos-dialog__label">Sector</label>
              <q-select
                v-model="form.printSector"
                dense
                options-dense
                outlined
                dark
                hide-bottom-space
                popup-content-class="bar-select-menu"
                :options="sectors"
                emit-value
                map-options
                class="productos-dialog__field"
              />
            </div>

            <div class="productos-dialog__field-block productos-dialog__field-block--toggle">
              <span class="productos-dialog__label">Disponible</span>
              <div class="productos-dialog__toggle-row">
                <q-toggle v-model="form.manualAvailable" dense dark class="productos-dialog__toggle" />
                <span class="productos-dialog__toggle-state">{{ form.manualAvailable ? 'ON' : 'OFF' }}</span>
              </div>
            </div>
          </div>
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-section class="productos-dialog__split-section">
          <div class="productos-dialog__split">
            <div class="productos-dialog__split-col productos-dialog__catalog">
              <div class="productos-dialog__split-head">Insumos</div>

              <q-input
                v-model="recipeSearch"
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
                  v-for="ing in recipeCatalog"
                  :key="ing.id"
                  type="button"
                  class="productos-dialog__catalog-item"
                  @click="addToRecipe(ing.id)"
                >
                  <span class="productos-dialog__catalog-name">{{ ing.name }}</span>
                  <span class="productos-dialog__catalog-add">+</span>
                </button>
                <div v-if="!recipeCatalog.length" class="productos-dialog__empty">
                  {{ recipeSearch ? 'Sin resultados' : 'Sin insumos disponibles' }}
                </div>
              </div>
            </div>

            <div class="productos-dialog__split-col productos-dialog__cart">
              <div class="productos-dialog__split-head">Receta</div>

              <div class="productos-dialog__cart-scroll">
                <div
                  v-for="line in form.recipe"
                  :key="line.ingredientId"
                  class="productos-dialog__recipe-line"
                >
                  <span class="productos-dialog__recipe-name">{{ ingredientName(line.ingredientId) }}</span>
                  <span class="productos-dialog__recipe-leader" aria-hidden="true" />
                  <div class="productos-dialog__recipe-qty">
                    <q-input
                      :model-value="line.quantity"
                      dense
                      outlined
                      dark
                      hide-bottom-space
                      type="number"
                      min="0.01"
                      step="0.01"
                      class="productos-dialog__qty"
                      @update:model-value="(v) => updateRecipeQty(line.ingredientId, Number(v))"
                    />
                    <span class="productos-dialog__recipe-unit">{{ ingredientUnit(line.ingredientId) }}</span>
                  </div>
                  <q-btn
                    flat
                    round
                    dense
                    icon="close"
                    size="sm"
                    class="bar-action-btn productos-dialog__cart-remove"
                    @click="removeFromRecipe(line.ingredientId)"
                  />
                </div>
                <div v-if="!form.recipe?.length" class="productos-dialog__empty">
                  Agregá insumos desde la lista
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
