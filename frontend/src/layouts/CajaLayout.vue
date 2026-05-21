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
          <q-icon name="point_of_sale" class="q-mr-sm" />
          Caja
        </q-toolbar-title>
        <div class="q-mr-md text-caption">{{ auth.user?.name }}</div>
        <q-btn flat round icon="logout" @click="logout" />
      </q-toolbar>
    </q-header>

    <q-drawer show-if-above bordered class="bg-grey-10" :width="200">
      <q-list padding>
        <q-item v-ripple clickable to="/caja" exact>
          <q-item-section avatar><q-icon name="payments" /></q-item-section>
          <q-item-section>Cobrar</q-item-section>
        </q-item>
        <q-item v-ripple clickable to="/caja/historial" exact>
          <q-item-section avatar><q-icon name="history" /></q-item-section>
          <q-item-section>Historial</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
