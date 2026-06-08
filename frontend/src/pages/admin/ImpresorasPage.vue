<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { impresionApi, type Printer, type PrintJob } from '@/services/impresion.api';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import BarGoldBtn from '@/components/admin/BarGoldBtn.vue';
import { useAdaptiveTableRows } from '@/composables/useAdaptiveTableRows';
import type { PrintSector } from '@/types';

const $q = useQuasar();
const impresoras = ref<Printer[]>([]);
const jobs = ref<PrintJob[]>([]);
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

const sectors: { label: string; value: PrintSector }[] = [
  { label: 'Cocina', value: 'COCINA' },
  { label: 'Barra', value: 'BARRA' },
];

const form = ref<{ name: string; sector: PrintSector; address: string }>({
  name: '',
  sector: 'COCINA',
  address: '192.168.1.100:9100',
});

const filteredImpresoras = computed(() => {
  const q = searchFilter.value.trim().toLowerCase();
  if (!q) return impresoras.value;
  return impresoras.value.filter((p) => {
    const sector = sectorLabel(p.sector).toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      sector.includes(q)
    );
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredImpresoras.value.length / rowsPerPage.value)));

const paginatedImpresoras = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredImpresoras.value.slice(start, start + rowsPerPage.value);
});

const pageInfo = computed(() => {
  const total = filteredImpresoras.value.length;
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

const recentJobs = computed(() => jobs.value.slice(0, 20));

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

watch(() => paginatedImpresoras.value.length, () => void nextTick(recalculateRows));

function clearSearch() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  search.value = '';
  searchFilter.value = '';
}

function sectorLabel(sector: PrintSector) {
  return sectors.find((s) => s.value === sector)?.label ?? sector;
}

function sectorBadgeClass(sector: PrintSector) {
  return sector === 'BARRA' ? 'bar-tag--accent' : 'bar-tag--cocina';
}

function jobStatusClass(status: string) {
  if (status === 'IMPRESO') return 'bar-stock-pill--ok';
  if (status === 'ERROR') return 'bar-stock-pill--low';
  return 'bar-stock-pill--warn';
}

function jobStatusLabel(status: string) {
  if (status === 'IMPRESO') return 'Impreso';
  if (status === 'ERROR') return 'Error';
  if (status === 'PENDIENTE') return 'Pendiente';
  return status;
}

function formatJobTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function load() {
  loading.value = true;
  try {
    [impresoras.value, jobs.value] = await Promise.all([impresionApi.impresoras(), impresionApi.jobs()]);
  } finally {
    loading.value = false;
    await nextTick();
    recalculateRows();
  }
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

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) page.value = p;
}

async function save() {
  try {
    if (editingId.value) {
      await impresionApi.updateImpresora(editingId.value, form.value);
    } else {
      await impresionApi.createImpresora(form.value);
    }
    $q.notify({ type: 'positive', message: 'Impresora guardada' });
    dialog.value = false;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error al guardar' });
  }
}
</script>

<template>
  <q-page class="q-pa-md admin-page fit impresoras-page">
    <div class="admin-page__header">
      <div class="admin-module-page__title-row">
        <AdminPageTitle title="Impresoras" font="chairdrobe" />
        <BarGoldBtn class="admin-module-page__cta" icon="add" label="Nueva impresora" @click="openCreate" />
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        clearable
        placeholder="Buscar impresora..."
        class="bar-search q-mb-md"
        @clear="clearSearch"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <div ref="tableBodyRef" class="admin-page__body impresoras-page__body">
      <div class="bar-table-shell">
        <q-table
          class="admin-page__table bar-table bar-table--fit"
          flat
          dark
          :rows="paginatedImpresoras"
          row-key="id"
          :loading="loading"
          hide-pagination
          :pagination="{ rowsPerPage: rowsPerPage }"
          :columns="[
            { name: 'name', label: 'Impresora', field: 'name', align: 'left' },
            { name: 'sector', label: 'Sector', field: 'sector', align: 'left' },
            { name: 'address', label: 'Dirección', field: 'address', align: 'left' },
            { name: 'active', label: 'Estado', field: 'active', align: 'center' },
            { name: 'actions', label: 'Acciones', field: 'id', align: 'right' },
          ]"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="bar-table__name">{{ props.row.name }}</q-td>
          </template>
          <template #body-cell-sector="props">
            <q-td :props="props">
              <span class="bar-tag" :class="sectorBadgeClass(props.row.sector)">
                {{ sectorLabel(props.row.sector) }}
              </span>
            </q-td>
          </template>
          <template #body-cell-address="props">
            <q-td :props="props" class="bar-table__muted">{{ props.row.address }}</q-td>
          </template>
          <template #body-cell-active="props">
            <q-td :props="props">
              <span v-if="props.row.active" class="bar-stock-pill bar-stock-pill--ok">Activa</span>
              <span v-else class="bar-tag bar-tag--muted">Inactiva</span>
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
              {{ searchFilter ? 'Ninguna impresora coincide con la búsqueda' : 'No hay impresoras cargadas' }}
            </div>
          </template>
        </q-table>
      </div>

      <div
        v-if="filteredImpresoras.length"
        ref="tableFooterRef"
        class="bar-table-footer row items-center justify-between"
      >
        <span>
          Mostrando {{ pageInfo.from }} a {{ pageInfo.to }} de {{ pageInfo.total }} impresoras
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

      <div class="impresoras-page__jobs-section">
        <h2 class="impresoras-page__jobs-title">Últimos trabajos de impresión</h2>
        <div class="bar-table-shell impresoras-page__jobs-table">
          <q-table
            class="bar-table"
            flat
            dark
            :rows="recentJobs"
            row-key="id"
            hide-pagination
            :pagination="{ rowsPerPage: 0 }"
            :columns="[
              { name: 'id', label: '#', field: 'id', align: 'left' },
              { name: 'sector', label: 'Sector', field: 'sector', align: 'left' },
              { name: 'status', label: 'Estado', field: 'status', align: 'center' },
              { name: 'error', label: 'Error', field: 'errorMessage', align: 'left' },
              { name: 'createdAt', label: 'Fecha', field: 'createdAt', align: 'right' },
            ]"
          >
            <template #body-cell-sector="props">
              <q-td :props="props">
                <span class="bar-tag" :class="sectorBadgeClass(props.row.sector)">
                  {{ sectorLabel(props.row.sector) }}
                </span>
              </q-td>
            </template>
            <template #body-cell-status="props">
              <q-td :props="props">
                <span class="bar-stock-pill" :class="jobStatusClass(props.row.status)">
                  {{ jobStatusLabel(props.row.status) }}
                </span>
              </q-td>
            </template>
            <template #body-cell-error="props">
              <q-td :props="props" class="bar-table__muted">
                {{ props.row.errorMessage ?? '—' }}
              </q-td>
            </template>
            <template #body-cell-createdAt="props">
              <q-td :props="props" class="bar-table__unit">{{ formatJobTime(props.row.createdAt) }}</q-td>
            </template>
            <template #no-data>
              <div class="full-width text-center text-grey-5 q-pa-lg">Sin trabajos de impresión recientes</div>
            </template>
          </q-table>
        </div>
      </div>
    </div>

    <q-dialog v-model="dialog">
      <q-card flat bordered dark class="login-card productos-dialog productos-dialog--compact">
        <q-card-section class="productos-dialog__header">
          <span class="productos-dialog__header-title bar-page-title__text">
            {{ editingId ? 'Editar impresora' : 'Nueva impresora' }}
          </span>
          <q-btn flat dense round icon="close" aria-label="Cerrar" class="productos-dialog__close" v-close-popup />
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-section class="productos-dialog__fields">
          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="impresora-nombre">Nombre</label>
            <q-input
              id="impresora-nombre"
              v-model="form.name"
              dense
              outlined
              dark
              hide-bottom-space
              class="productos-dialog__field"
            />
          </div>

          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label">Sector</label>
            <q-select
              v-model="form.sector"
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

          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="impresora-direccion">IP:Puerto</label>
            <q-input
              id="impresora-direccion"
              v-model="form.address"
              dense
              outlined
              dark
              hide-bottom-space
              placeholder="192.168.1.100:9100"
              class="productos-dialog__field"
            />
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
