<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { mesasApi } from '@/services/mesas.api';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import BarGoldBtn from '@/components/admin/BarGoldBtn.vue';
import { useAdaptiveTableRows } from '@/composables/useAdaptiveTableRows';
import { mesaStatusLabel } from '@/utils/format';
import type { Mesa, TableStatus } from '@/types';

const $q = useQuasar();
const mesas = ref<Mesa[]>([]);
const search = ref('');
const searchFilter = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
const loading = ref(false);
const dialog = ref(false);
const editingId = ref<number | null>(null);
const page = ref(1);
const tableBodyRef = ref<HTMLElement | null>(null);
const tableFooterRef = ref<HTMLElement | null>(null);

const { rowsPerPage, recalculate: recalculateRows } = useAdaptiveTableRows(tableBodyRef, {
  footerRef: tableFooterRef,
  maxRows: 15,
  watchSources: [loading],
});

const form = ref({ number: 1, name: '', capacity: 4 });

const filteredMesas = computed(() => {
  const q = searchFilter.value.trim().toLowerCase();
  if (!q) return mesas.value;
  return mesas.value.filter((m) => {
    const status = mesaStatusLabel[m.status]?.toLowerCase() ?? m.status.toLowerCase();
    return (
      String(m.number).includes(q) ||
      (m.name?.toLowerCase().includes(q) ?? false) ||
      status.includes(q) ||
      String(m.capacity).includes(q)
    );
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredMesas.value.length / rowsPerPage.value)));

const paginatedMesas = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredMesas.value.slice(start, start + rowsPerPage.value);
});

const pageInfo = computed(() => {
  const total = filteredMesas.value.length;
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

watch(() => paginatedMesas.value.length, () => void nextTick(recalculateRows));

function clearSearch() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  search.value = '';
  searchFilter.value = '';
}

function mesaStatusClass(status: TableStatus) {
  if (status === 'LIBRE') return 'bar-stock-pill--ok';
  if (status === 'OCUPADA') return 'bar-stock-pill--warn';
  if (status === 'CUENTA_PEDIDA') return 'bar-stock-pill--mid';
  return '';
}

function mesaDisplayName(mesa: Mesa) {
  return mesa.name?.trim() || '—';
}

async function load() {
  loading.value = true;
  try {
    mesas.value = await mesasApi.listAdmin();
  } finally {
    loading.value = false;
    await nextTick();
    recalculateRows();
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  form.value = { number: mesas.value.length + 1, name: '', capacity: 4 };
  dialog.value = true;
}

function openEdit(mesa: Mesa) {
  editingId.value = mesa.id;
  form.value = {
    number: mesa.number,
    name: mesa.name ?? '',
    capacity: mesa.capacity,
  };
  dialog.value = true;
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) page.value = p;
}

async function save() {
  try {
    if (editingId.value) {
      await mesasApi.update(editingId.value, {
        capacity: form.value.capacity,
        ...(form.value.name ? { name: form.value.name } : {}),
      });
    } else {
      await mesasApi.create({
        number: form.value.number,
        ...(form.value.name ? { name: form.value.name } : {}),
        capacity: form.value.capacity,
      });
    }
    $q.notify({ type: 'positive', message: editingId.value ? 'Mesa actualizada' : 'Mesa creada' });
    dialog.value = false;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error al guardar mesa' });
  }
}
</script>

<template>
  <q-page class="q-pa-md admin-page fit mesas-page">
    <div class="admin-page__header">
      <div class="admin-module-page__title-row">
        <AdminPageTitle title="Mesas" font="chairdrobe" />
        <BarGoldBtn class="admin-module-page__cta" icon="add" label="Nueva mesa" @click="openCreate" />
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        clearable
        placeholder="Buscar mesa..."
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
          :rows="paginatedMesas"
          row-key="id"
          :loading="loading"
          hide-pagination
          :pagination="{ rowsPerPage: rowsPerPage }"
          :columns="[
            { name: 'number', label: 'Número', field: 'number', align: 'left' },
            { name: 'name', label: 'Nombre', field: 'name', align: 'left' },
            { name: 'capacity', label: 'Capacidad', field: 'capacity', align: 'center' },
            { name: 'status', label: 'Estado', field: 'status', align: 'center' },
            { name: 'actions', label: 'Acciones', field: 'id', align: 'right' },
          ]"
        >
          <template #body-cell-number="props">
            <q-td :props="props" class="bar-table__name">{{ props.row.number }}</q-td>
          </template>
          <template #body-cell-name="props">
            <q-td :props="props" class="bar-table__muted">{{ mesaDisplayName(props.row) }}</q-td>
          </template>
          <template #body-cell-capacity="props">
            <q-td :props="props" class="bar-table__unit">{{ props.row.capacity }}</q-td>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <span
                v-if="props.row.status === 'RESERVADA'"
                class="bar-tag bar-tag--muted"
              >
                {{ mesaStatusLabel[props.row.status] ?? props.row.status }}
              </span>
              <span v-else class="bar-stock-pill" :class="mesaStatusClass(props.row.status)">
                {{ mesaStatusLabel[props.row.status] ?? props.row.status }}
              </span>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat dense round icon="edit" class="bar-action-btn" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>
          <template #no-data>
            <div class="full-width text-center text-grey-5 q-pa-lg">
              {{ searchFilter ? 'Ninguna mesa coincide con la búsqueda' : 'No hay mesas cargadas' }}
            </div>
          </template>
        </q-table>
      </div>

      <div
        v-if="filteredMesas.length"
        ref="tableFooterRef"
        class="bar-table-footer row items-center justify-between"
      >
        <span>
          Mostrando {{ pageInfo.from }} a {{ pageInfo.to }} de {{ pageInfo.total }} mesas
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
      <q-card flat bordered dark class="login-card productos-dialog productos-dialog--compact">
        <q-card-section class="productos-dialog__header">
          <span class="productos-dialog__header-title bar-page-title__text">
            {{ editingId ? 'Editar mesa' : 'Nueva mesa' }}
          </span>
          <q-btn flat dense round icon="close" aria-label="Cerrar" class="productos-dialog__close" v-close-popup />
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-section class="productos-dialog__fields">
          <div v-if="!editingId" class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="mesa-numero">Número</label>
            <q-input
              id="mesa-numero"
              v-model.number="form.number"
              dense
              outlined
              dark
              hide-bottom-space
              type="number"
              min="1"
              step="1"
              class="productos-dialog__field"
            />
          </div>

          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="mesa-nombre">Nombre (opcional)</label>
            <q-input
              id="mesa-nombre"
              v-model="form.name"
              dense
              outlined
              dark
              hide-bottom-space
              class="productos-dialog__field"
            />
          </div>

          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="mesa-capacidad">Capacidad</label>
            <q-input
              id="mesa-capacidad"
              v-model.number="form.capacity"
              dense
              outlined
              dark
              hide-bottom-space
              type="number"
              min="1"
              step="1"
              class="productos-dialog__field"
            />
          </div>
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-actions align="right" class="productos-dialog__actions">
          <q-btn flat label="Cancelar" v-close-popup color="grey-5" />
          <BarGoldBtn :label="editingId ? 'Guardar' : 'Crear'" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
