<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { adminApi } from '@/services/admin.api';
import { useAuthStore } from '@/stores/auth.store';
import AdminPageTitle from '@/components/admin/AdminPageTitle.vue';
import BarGoldBtn from '@/components/admin/BarGoldBtn.vue';
import { useAdaptiveTableRows } from '@/composables/useAdaptiveTableRows';
import type { RoleName, User } from '@/types';

const $q = useQuasar();
const auth = useAuthStore();
const usuarios = ref<User[]>([]);
const search = ref('');
const searchFilter = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
const loading = ref(false);
const showDialog = ref(false);
const editingId = ref<number | null>(null);
const page = ref(1);
const tableBodyRef = ref<HTMLElement | null>(null);
const tableFooterRef = ref<HTMLElement | null>(null);

const { rowsPerPage, recalculate: recalculateRows } = useAdaptiveTableRows(tableBodyRef, {
  footerRef: tableFooterRef,
  maxRows: 15,
  watchSources: [loading],
});

const emptyForm = () => ({
  username: '',
  password: '',
  name: '',
  role: 'MOZO' as RoleName,
  active: true,
});

const form = ref(emptyForm());

const roles: { label: string; value: RoleName }[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Caja', value: 'CAJA' },
  { label: 'Mozo', value: 'MOZO' },
];

function roleLabel(role: RoleName) {
  return roles.find((r) => r.value === role)?.label ?? role;
}

function roleBadge(role: RoleName): { label: string; class: string } {
  const label = roleLabel(role);
  if (role === 'ADMIN') return { label, class: 'bar-tag--accent' };
  return { label, class: 'bar-tag--cocina' };
}

const filteredUsuarios = computed(() => {
  const q = searchFilter.value.trim().toLowerCase();
  if (!q) return usuarios.value;
  return usuarios.value.filter((u) => {
    const estado = u.active !== false ? 'activo' : 'suspendido';
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      roleLabel(u.role).toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      estado.includes(q)
    );
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsuarios.value.length / rowsPerPage.value)));

const paginatedUsuarios = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredUsuarios.value.slice(start, start + rowsPerPage.value);
});

const pageInfo = computed(() => {
  const total = filteredUsuarios.value.length;
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

watch(() => paginatedUsuarios.value.length, () => void nextTick(recalculateRows));

function apiError(e: unknown) {
  const data = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  return Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
}

async function load() {
  loading.value = true;
  try {
    usuarios.value = await adminApi.usuarios();
  } finally {
    loading.value = false;
    await nextTick();
    recalculateRows();
  }
}

onMounted(() => void load());

function openCreate() {
  editingId.value = null;
  form.value = emptyForm();
  showDialog.value = true;
}

function openEdit(user: User) {
  editingId.value = user.id;
  form.value = {
    name: user.name,
    username: user.username,
    password: '',
    role: user.role,
    active: user.active !== false,
  };
  showDialog.value = true;
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) page.value = p;
}

async function save() {
  try {
    if (editingId.value) {
      const payload: Parameters<typeof adminApi.actualizarUsuario>[1] = {
        name: form.value.name,
        username: form.value.username,
        role: form.value.role,
        active: form.value.active,
      };
      if (form.value.password.trim()) {
        payload.password = form.value.password;
      }
      await adminApi.actualizarUsuario(editingId.value, payload);
      $q.notify({ type: 'positive', message: 'Usuario actualizado' });
    } else {
      await adminApi.crearUsuario({
        name: form.value.name,
        username: form.value.username,
        password: form.value.password,
        role: form.value.role,
      });
      $q.notify({ type: 'positive', message: 'Usuario creado' });
    }
    showDialog.value = false;
    await load();
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: apiError(e) ?? 'Error al guardar usuario' });
  }
}

function toggleActive(user: User) {
  const activating = user.active === false;
  const action = activating ? 'reactivar' : 'suspender';

  $q.dialog({
    title: activating ? 'Reactivar usuario' : 'Suspender usuario',
    message: activating
      ? `¿Reactivar a ${user.name}?`
      : `¿Suspender a ${user.name}? No podrá iniciar sesión.`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        if (activating) {
          await adminApi.actualizarUsuario(user.id, { active: true });
        } else {
          await adminApi.desactivarUsuario(user.id);
        }
        $q.notify({ type: 'positive', message: `Usuario ${action === 'reactivar' ? 'reactivado' : 'suspendido'}` });
        await load();
      } catch (e: unknown) {
        $q.notify({ type: 'negative', message: apiError(e) ?? `Error al ${action}` });
      }
    })();
  });
}

const isSelf = (user: User) => user.id === auth.user?.id;
const editingSelf = () => editingId.value !== null && editingId.value === auth.user?.id;
</script>

<template>
  <q-page class="q-pa-md admin-page fit usuarios-page">
    <div class="admin-page__header">
      <div class="admin-module-page__title-row">
        <AdminPageTitle title="Usuarios" font="chairdrobe" />
        <BarGoldBtn class="admin-module-page__cta" icon="add" label="Nuevo usuario" @click="openCreate" />
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        clearable
        placeholder="Buscar usuario..."
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
          :rows="paginatedUsuarios"
          row-key="id"
          :loading="loading"
          hide-pagination
          :pagination="{ rowsPerPage: rowsPerPage }"
          :columns="[
            { name: 'name', label: 'Nombre', field: 'name', align: 'left' },
            { name: 'username', label: 'Usuario', field: 'username', align: 'left' },
            { name: 'role', label: 'Rol', field: 'role', align: 'left' },
            { name: 'active', label: 'Estado', field: 'active', align: 'center' },
            { name: 'actions', label: 'Acciones', field: 'id', align: 'right' },
          ]"
        >
          <template #body-cell-name="props">
            <q-td :props="props" class="bar-table__name" :class="{ 'text-grey-6': props.row.active === false }">
              {{ props.row.name }}
              <span v-if="isSelf(props.row)" class="bar-tag bar-tag--accent q-ml-xs">Vos</span>
            </q-td>
          </template>
          <template #body-cell-username="props">
            <q-td :props="props">{{ props.row.username }}</q-td>
          </template>
          <template #body-cell-role="props">
            <q-td :props="props">
              <span class="bar-tag" :class="roleBadge(props.row.role).class">
                {{ roleBadge(props.row.role).label }}
              </span>
            </q-td>
          </template>
          <template #body-cell-active="props">
            <q-td :props="props">
              <span
                class="bar-stock-pill"
                :class="props.row.active !== false ? 'bar-stock-pill--ok' : 'bar-stock-pill--low'"
              >
                {{ props.row.active !== false ? 'Activo' : 'Suspendido' }}
              </span>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat dense round icon="edit" class="bar-action-btn" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                :icon="props.row.active !== false ? 'person_off' : 'person'"
                class="bar-action-btn"
                :disable="isSelf(props.row)"
                @click="toggleActive(props.row)"
              >
                <q-tooltip>{{ props.row.active !== false ? 'Suspender' : 'Reactivar' }}</q-tooltip>
              </q-btn>
            </q-td>
          </template>
          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>
          <template #no-data>
            <div class="full-width text-center text-grey-5 q-pa-lg">
              {{ searchFilter ? 'Ningún usuario coincide con la búsqueda' : 'No hay usuarios cargados' }}
            </div>
          </template>
        </q-table>
      </div>

      <div
        v-if="filteredUsuarios.length"
        ref="tableFooterRef"
        class="bar-table-footer row items-center justify-between"
      >
        <span>
          Mostrando {{ pageInfo.from }} a {{ pageInfo.to }} de {{ pageInfo.total }} usuarios
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

    <q-dialog v-model="showDialog" persistent>
      <q-card dark class="login-card" style="min-width: 380px">
        <q-card-section class="text-h6 bar-page-title__text" style="font-size: 1.2rem">
          {{ editingId ? 'Editar usuario' : 'Nuevo usuario' }}
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nombre" outlined dark />
          <q-input v-model="form.username" label="Usuario" outlined dark :readonly="editingSelf()" />
          <q-input
            v-model="form.password"
            :label="editingId ? 'Nueva contraseña (opcional)' : 'Contraseña'"
            type="password"
            outlined
            dark
          />
          <q-select
            v-model="form.role"
            :options="roles"
            label="Rol"
            outlined
            dark
            emit-value
            map-options
            :disable="editingSelf()"
          />
          <q-toggle
            v-if="editingId"
            v-model="form.active"
            label="Usuario activo"
            dark
            :disable="editingSelf()"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup color="grey-5" />
          <BarGoldBtn :label="editingId ? 'Guardar' : 'Crear'" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
