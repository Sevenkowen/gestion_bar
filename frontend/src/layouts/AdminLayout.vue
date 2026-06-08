<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import BarLogo from '@/components/brand/BarLogo.vue';
import AdminNavList from '@/components/admin/AdminNavList.vue';
import type { RoleName } from '@/types';

const router = useRouter();
const auth = useAuthStore();
const drawerOpen = ref(false);

const roleLabel = computed(() => {
  const map: Record<RoleName, string> = {
    ADMIN: 'Propietario',
    CAJA: 'Caja',
    MOZO: 'Mozo',
  };
  return auth.user?.role ? map[auth.user.role] : '';
});

const userInitial = computed(() => auth.user?.name?.charAt(0)?.toUpperCase() ?? '?');

function logout() {
  auth.logout();
  void router.push('/login');
}
</script>

<template>
  <q-layout view="hhh lpr lff" class="admin-layout">
    <q-header class="bar-header">
      <div class="bar-header__chalk" aria-hidden="true" />
      <q-toolbar class="bar-header__toolbar">
        <q-btn
          flat
          round
          dense
          icon="menu"
          color="grey-5"
          class="lt-md q-mr-sm"
          @click="drawerOpen = !drawerOpen"
        />

        <div class="bar-brand row items-center no-wrap">
          <BarLogo size="lg" />
        </div>

        <q-space />

        <div class="row items-center no-wrap q-gutter-sm">
          <div class="text-right gt-xs">
            <div class="bar-user__name">{{ auth.user?.name }}</div>
            <div class="bar-user__role">{{ roleLabel }}</div>
          </div>
          <q-avatar size="40px" class="bar-user__avatar" text-color="dark" color="primary">
            {{ userInitial }}
          </q-avatar>
          <q-btn flat round dense icon="logout" color="grey-5" @click="logout">
            <q-tooltip>Salir</q-tooltip>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawerOpen"
      :width="196"
      :breakpoint="1024"
      overlay
      bordered
      class="bar-drawer lt-md"
    >
      <q-scroll-area class="fit">
        <AdminNavList />
      </q-scroll-area>
    </q-drawer>

    <q-page-container class="admin-shell">
      <div class="admin-shell__grid">
        <aside class="admin-shell__nav bar-frame gt-sm">
          <AdminNavList />
        </aside>

        <main class="admin-shell__main bar-frame">
          <router-view />
        </main>
      </div>
    </q-page-container>
  </q-layout>
</template>
