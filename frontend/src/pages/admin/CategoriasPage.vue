<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { categoriasApi } from '@/services/categorias.api';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import BarGoldBtn from '@/components/admin/BarGoldBtn.vue';
import { useAdaptiveTableRows } from '@/composables/useAdaptiveTableRows';
import type { Category } from '@/types';

const $q = useQuasar();
const categorias = ref<Category[]>([]);
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

const form = ref({ name: '', sortOrder: 0 });

const filteredCategorias = computed(() => {
  const q = searchFilter.value.trim().toLowerCase();
  if (!q) return categorias.value;
  return categorias.value.filter(
    (c) => c.name.toLowerCase().includes(q) || String(c.sortOrder).includes(q),
  );
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCategorias.value.length / rowsPerPage.value)));

const paginatedCategorias = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredCategorias.value.slice(start, start + rowsPerPage.value);
});

const pageInfo = computed(() => {
  const total = filteredCategorias.value.length;
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

watch(() => paginatedCategorias.value.length, () => void nextTick(recalculateRows));

function clearSearch() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  search.value = '';
  searchFilter.value = '';
}

async function load() {
  loading.value = true;
  try {
    categorias.value = await categoriasApi.list();
  } finally {
    loading.value = false;
    await nextTick();
    recalculateRows();
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

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) page.value = p;
}

async function save() {
  try {
    if (editingId.value) {
      await categoriasApi.update(editingId.value, form.value);
    } else {
      await categoriasApi.create(form.value);
    }
    $q.notify({ type: 'positive', message: 'Categoría guardada' });
    dialog.value = false;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error al guardar' });
  }
}

function remove(category: Category) {
  $q.dialog({
    title: 'Eliminar categoría',
    message:
      `¿Ocultar "${category.name}" del listado?\n\n` +
      'Solo se puede eliminar si ningún producto activo la usa. ' +
      'Los productos que ya la tenían conservan la categoría en el historial.',
    cancel: true,
  }).onOk(() => {
    void (async () => {
      try {
        await categoriasApi.remove(category.id);
        $q.notify({ type: 'positive', message: 'Categoría eliminada' });
        await load();
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
        const text = Array.isArray(msg) ? msg.join(', ') : msg;
        $q.notify({ type: 'negative', message: text ?? 'No se pudo eliminar la categoría' });
      }
    })();
  });
}
</script>

<template>
  <q-page class="q-pa-md admin-page fit categorias-page">
    <div class="admin-page__header">
      <div class="admin-module-page__title-row">
        <AdminPageTitle title="Categorías" font="chairdrobe" />
        <BarGoldBtn class="admin-module-page__cta" icon="add" label="Nueva categoría" @click="openCreate" />
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        clearable
        placeholder="Buscar categoría..."
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
          :rows="paginatedCategorias"
          row-key="id"
          :loading="loading"
          hide-pagination
          :pagination="{ rowsPerPage: rowsPerPage }"
          :columns="[
            { name: 'name', label: 'Categoría', field: 'name', align: 'left' },
            { name: 'sortOrder', label: 'Orden', field: 'sortOrder', align: 'center' },
            { name: 'actions', label: 'Acciones', field: 'id', align: 'right' },
          ]"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="bar-table__name">{{ props.row.name }}</q-td>
          </template>
          <template #body-cell-sortOrder="props">
            <q-td :props="props" class="bar-table__muted">{{ props.row.sortOrder }}</q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat dense round icon="edit" class="bar-action-btn" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="delete_outline" class="bar-action-btn" @click="remove(props.row)">
                <q-tooltip>Eliminar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>
          <template #no-data>
            <div class="full-width text-center text-grey-5 q-pa-lg">
              {{ searchFilter ? 'Ninguna categoría coincide con la búsqueda' : 'No hay categorías cargadas' }}
            </div>
          </template>
        </q-table>
      </div>

      <div
        v-if="filteredCategorias.length"
        ref="tableFooterRef"
        class="bar-table-footer row items-center justify-between"
      >
        <span>
          Mostrando {{ pageInfo.from }} a {{ pageInfo.to }} de {{ pageInfo.total }} categorías
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
            {{ editingId ? 'Editar categoría' : 'Nueva categoría' }}
          </span>
          <q-btn flat dense round icon="close" aria-label="Cerrar" class="productos-dialog__close" v-close-popup />
        </q-card-section>

        <div class="productos-dialog__rule" />

        <q-card-section class="productos-dialog__fields">
          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="categoria-nombre">Nombre</label>
            <q-input
              id="categoria-nombre"
              v-model="form.name"
              dense
              outlined
              dark
              hide-bottom-space
              class="productos-dialog__field"
            />
          </div>

          <div class="productos-dialog__field-block">
            <label class="productos-dialog__label" for="categoria-orden">Orden</label>
            <q-input
              id="categoria-orden"
              v-model.number="form.sortOrder"
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
          <BarGoldBtn label="Guardar" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
