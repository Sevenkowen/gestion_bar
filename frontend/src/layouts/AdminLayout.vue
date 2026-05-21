<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const auth = useAuthStore();

function logout() {
  auth.logout();
  void router.push('/login');
}
</script>

<template>
  <q-layout view="hHh lpR fFf" class="bg-dark">
    <q-header elevated class="bg-grey-10">
      <q-toolbar>
        <q-toolbar-title>
          <q-icon name="admin_panel_settings" class="q-mr-sm" />
          Admin
        </q-toolbar-title>
        <div class="q-mr-md text-caption">{{ auth.user?.name }}</div>
        <q-btn flat round icon="logout" @click="logout" />
      </q-toolbar>
    </q-header>

    <q-drawer show-if-above bordered class="bg-grey-10" :width="220">
      <q-list padding>
        <q-item v-ripple clickable to="/admin" exact>
          <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
          <q-item-section>Dashboard</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/admin/productos" exact>
          <q-item-section avatar><q-icon name="lunch_dining" /></q-item-section>
          <q-item-section>Productos</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/admin/combos" exact>
          <q-item-section avatar><q-icon name="fastfood" /></q-item-section>
          <q-item-section>Combos</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/admin/menu" exact>
          <q-item-section avatar><q-icon name="restaurant_menu" /></q-item-section>
          <q-item-section>Menú / Carta</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/admin/categorias" exact>
          <q-item-section avatar><q-icon name="category" /></q-item-section>
          <q-item-section>Categorías</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/admin/insumos" exact>
          <q-item-section avatar><q-icon name="inventory_2" /></q-item-section>
          <q-item-section>Insumos y stock</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/admin/mesas" exact>
          <q-item-section avatar><q-icon name="table_restaurant" /></q-item-section>
          <q-item-section>Mesas</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/admin/impresoras" exact>
          <q-item-section avatar><q-icon name="print" /></q-item-section>
          <q-item-section>Impresoras</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/admin/usuarios" exact>
          <q-item-section avatar><q-icon name="people" /></q-item-section>
          <q-item-section>Usuarios</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
