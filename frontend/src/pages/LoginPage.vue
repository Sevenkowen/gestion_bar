<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const $q = useQuasar();
const auth = useAuthStore();

const username = ref('');
const password = ref('');

async function onSubmit() {
  try {
    const user = await auth.login(username.value, password.value);
    $q.notify({ type: 'positive', message: `Bienvenido, ${user.name}` });
    void router.push(auth.homeRoute);
  } catch {
    $q.notify({ type: 'negative', message: 'Usuario o contraseña incorrectos' });
  }
}
</script>

<template>
  <q-page class="flex flex-center bg-dark">
    <q-card flat bordered class="login-card q-pa-lg">
      <q-card-section class="text-center">
        <q-icon name="restaurant" size="48px" color="amber" />
        <div class="text-h5 q-mt-md text-weight-bold">SistemaBar</div>
        <div class="text-caption text-grey-5">Gestión de bar & restaurante</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onSubmit">
          <q-input
            v-model="username"
            label="Usuario"
            outlined
            dark
            class="q-mb-md"
            autocomplete="username"
            :rules="[(v) => !!v || 'Requerido']"
          />
          <q-input
            v-model="password"
            label="Contraseña"
            type="password"
            outlined
            dark
            autocomplete="current-password"
            :rules="[(v) => !!v || 'Requerido']"
          />
          <q-btn
            type="submit"
            label="Ingresar"
            color="primary"
            class="full-width q-mt-lg"
            size="lg"
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center text-caption text-grey-6">
        admin / admin123 · mozo1 / mozo123 · caja1 / caja123
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.login-card {
  width: 100%;
  max-width: 400px;
  background: #1a1a1a;
}
</style>
