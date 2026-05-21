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
          <q-icon name="restaurant" class="q-mr-sm" />
          Mozos
        </q-toolbar-title>
        <div class="q-mr-md text-caption">{{ auth.user?.name }}</div>
        <q-btn flat round icon="logout" @click="logout" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
