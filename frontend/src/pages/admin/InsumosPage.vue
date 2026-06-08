<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { stockApi, type UnitType } from '@/services/stock.api';
import type { Ingredient, IngredientKind } from '@/types';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import BarGoldBtn from '@/components/admin/BarGoldBtn.vue';
import { useAdaptiveTableRows } from '@/composables/useAdaptiveTableRows';

const $q = useQuasar();
const insumos = ref<Ingredient[]>([]);
const search = ref('');
const searchFilter = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
const loading = ref(false);
const dialog = ref(false);
const adjustDialog = ref(false);
const editingId = ref<number | null>(null);
const adjustId = ref<number | null>(null);
const adjustQty = ref(0);
const page = ref(1);
const tableBodyRef = ref<HTMLElement | null>(null);
const tableFooterRef = ref<HTMLElement | null>(null);

const { rowsPerPage, recalculate: recalculateRows } = useAdaptiveTableRows(tableBodyRef, {
  footerRef: tableFooterRef,
  maxRows: 15,
  watchSources: [loading],
});

const units: { label: string; value: UnitType }[] = [
  { label: 'Unidad', value: 'UNIDAD' },
  { label: 'Gramo', value: 'GRAMO' },
  { label: 'Kilo', value: 'KILO' },
  { label: 'ml', value: 'ML' },
  { label: 'Litro', value: 'LITRO' },
];

const kinds: { label: string; value: IngredientKind }[] = [
  { label: 'Cocina (recetas de comida)', value: 'COCINA' },
  { label: 'Bebida (menú / combos)', value: 'BEBIDA' },
];

const form = ref<{ name: string; kind: IngredientKind; unit: UnitType; currentStock: number; minStock: number; cost: number }>({
  name: '',
  kind: 'COCINA',
  unit: 'UNIDAD',
  currentStock: 0,
  minStock: 0,
  cost: 0,
});

const filteredInsumos = computed(() => {
  const q = searchFilter.value.trim().toLowerCase();
  if (!q) return insumos.value;
  return insumos.value.filter((i) => {
    const name = i.name.toLowerCase();
    const tipo = tipoBadge(i).label.toLowerCase();
    const unit = i.unit.toLowerCase();
    return name.includes(q) || tipo.includes(q) || unit.includes(q);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredInsumos.value.length / rowsPerPage.value)));

const paginatedInsumos = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredInsumos.value.slice(start, start + rowsPerPage.value);
});

const pageInfo = computed(() => {
  const total = filteredInsumos.value.length;
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

watch(() => paginatedInsumos.value.length, () => void nextTick(recalculateRows));

async function load() {
  loading.value = true;
  try {
    insumos.value = await stockApi.ingredientes();
  } finally {
    loading.value = false;
    await nextTick();
    recalculateRows();
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  form.value = { name: '', kind: 'COCINA', unit: 'UNIDAD', currentStock: 0, minStock: 0, cost: 0 };
  dialog.value = true;
}

function openEdit(insumo: Ingredient) {
  editingId.value = insumo.id;
  form.value = {
    name: insumo.name,
    kind: insumo.kind ?? 'COCINA',
    unit: insumo.unit as UnitType,
    currentStock: parseFloat(insumo.currentStock),
    minStock: parseFloat(insumo.minStock),
    cost: parseFloat(insumo.cost),
  };
  dialog.value = true;
}

function tipoBadge(insumo: Ingredient): { label: string; class: string } {
  if (insumo.kind === 'BEBIDA') return { label: 'Bebida', class: 'bar-tag--accent' };
  const n = insumo.name.toLowerCase();
  if (n.includes('salsa')) return { label: 'Salsas', class: 'bar-tag--accent' };
  if (n.includes('papa')) return { label: 'Papas', class: 'bar-tag--accent' };
  return { label: 'Cocina', class: 'bar-tag--cocina' };
}

function unitLabel(unit: string) {
  const map: Record<string, string> = {
    UNIDAD: 'Unidad',
    GRAMO: 'Gramo',
    KILO: 'Kilo',
    ML: 'ml',
    LITRO: 'Litro',
  };
  return map[unit] ?? unit;
}

function formatUnitCost(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `$ ${formatted}`;
}

function stockTone(current: string, min: string): 'ok' | 'warn' | 'mid' | 'low' {
  const c = parseFloat(current);
  const m = parseFloat(min) || 1;
  if (c <= m) return 'low';
  if (c <= m * 1.5) return 'mid';
  if (c <= m * 2.5) return 'warn';
  return 'ok';
}

function openAdjust(id: number) {
  adjustId.value = id;
  adjustQty.value = 0;
  adjustDialog.value = true;
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) page.value = p;
}

async function save() {
  try {
    if (editingId.value) {
      await stockApi.updateIngrediente(editingId.value, {
        name: form.value.name,
        kind: form.value.kind,
        unit: form.value.unit,
        minStock: form.value.minStock,
        cost: form.value.cost,
      });
    } else {
      await stockApi.createIngrediente(form.value);
    }
    $q.notify({ type: 'positive', message: 'Insumo guardado' });
    dialog.value = false;
    await load();
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar insumo' });
  }
}

async function ajustar() {
  if (!adjustId.value) return;
  await stockApi.ajustarStock(adjustId.value, adjustQty.value);
  adjustDialog.value = false;
  await load();
}
</script>

<template>
  <q-page class="q-pa-md admin-page fit insumos-page">
    <div class="admin-page__header">
      <div class="admin-module-page__title-row">
        <AdminPageTitle title="Insumos y stock" font="chairdrobe" />
        <BarGoldBtn class="admin-module-page__cta" icon="add" label="Nuevo insumo" @click="openCreate" />
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        clearable
        placeholder="Buscar insumo..."
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
        :rows="paginatedInsumos"
        row-key="id"
        :loading="loading"
        hide-pagination
        :pagination="{ rowsPerPage: rowsPerPage }"
        :columns="[
          { name: 'name', label: 'Insumo', field: 'name', align: 'left' },
          { name: 'kind', label: 'Tipo', field: 'kind', align: 'left' },
          { name: 'unit', label: 'Unidad', field: 'unit', align: 'left' },
          { name: 'currentStock', label: 'Stock', field: 'currentStock', align: 'center' },
          { name: 'minStock', label: 'Stock mín.', field: 'minStock', align: 'center' },
          { name: 'cost', label: 'Costo unit.', field: 'cost', align: 'right' },
          { name: 'actions', label: 'Acciones', field: 'id', align: 'right' },
        ]"
      >
        <template #body-cell-name="props">
          <q-td :props="props" class="bar-table__name">{{ props.row.name }}</q-td>
        </template>
        <template #body-cell-kind="props">
          <q-td :props="props">
            <span class="bar-tag" :class="tipoBadge(props.row).class">
              {{ tipoBadge(props.row).label }}
            </span>
          </q-td>
        </template>
        <template #body-cell-unit="props">
          <q-td :props="props" class="bar-table__unit">{{ unitLabel(props.row.unit) }}</q-td>
        </template>
        <template #body-cell-currentStock="props">
          <q-td :props="props">
            <span
              class="bar-stock-pill"
              :class="`bar-stock-pill--${stockTone(props.row.currentStock, props.row.minStock)}`"
            >
              {{ props.row.currentStock }}
            </span>
          </q-td>
        </template>
        <template #body-cell-cost="props">
          <q-td :props="props" class="text-price">{{ formatUnitCost(props.row.cost) }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense round icon="edit" class="bar-action-btn" @click="openEdit(props.row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="add_circle_outline" class="bar-action-btn" @click="openAdjust(props.row.id)">
              <q-tooltip>Ajustar stock</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center text-grey-5 q-pa-lg">
            {{ searchFilter ? 'Ningún insumo coincide con la búsqueda' : 'No hay insumos cargados' }}
          </div>
        </template>
        <template #loading>
          <q-inner-loading showing color="primary" />
        </template>
      </q-table>
      </div>

      <div
        v-if="filteredInsumos.length"
        ref="tableFooterRef"
        class="bar-table-footer row items-center justify-between"
      >
        <span>
          Mostrando {{ pageInfo.from }} a {{ pageInfo.to }} de {{ pageInfo.total }} insumos
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
      <q-card dark class="login-card" style="min-width: 380px">
        <q-card-section class="text-h6 bar-page-title__text" style="font-size: 1.2rem">
          {{ editingId ? 'Editar insumo' : 'Nuevo insumo' }}
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nombre del insumo" outlined dark />
          <q-select
            v-model="form.kind"
            :options="kinds"
            emit-value
            map-options
            label="Tipo"
            outlined
            dark
          />
          <q-select
            v-model="form.unit"
            :options="units"
            emit-value
            map-options
            label="Unidad de medida"
            outlined
            dark
            :disable="!!editingId"
          />
          <q-input
            v-if="!editingId"
            v-model.number="form.currentStock"
            label="Stock inicial"
            type="number"
            outlined
            dark
          />
          <q-input
            v-else
            :model-value="form.currentStock"
            label="Stock actual"
            outlined
            dark
            readonly
          />
          <q-input v-model.number="form.minStock" label="Stock mínimo" type="number" outlined dark />
          <q-input v-model.number="form.cost" label="Costo unitario ($)" type="number" outlined dark />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup color="grey-5" />
          <BarGoldBtn label="Guardar" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="adjustDialog">
      <q-card dark class="login-card" style="min-width: 320px">
        <q-card-section class="text-h6 bar-page-title__text" style="font-size: 1.2rem">Ajustar stock</q-card-section>
        <q-card-section>
          <q-input v-model.number="adjustQty" label="Cantidad (+entrada / -salida)" type="number" outlined dark />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup color="grey-5" />
          <BarGoldBtn label="Aplicar" @click="ajustar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
