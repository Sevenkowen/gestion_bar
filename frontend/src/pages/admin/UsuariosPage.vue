<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { adminApi } from '@/services/admin.api';
import type { RoleName, User } from '@/types';

const $q = useQuasar();
const usuarios = ref<User[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const form = ref<{ username: string; password: string; name: string; role: RoleName }>({
  username: '',
  password: '',
  name: '',
  role: 'MOZO',
});

const roles: { label: string; value: RoleName }[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Caja', value: 'CAJA' },
  { label: 'Mozo', value: 'MOZO' },
];

async function load() {
  loading.value = true;
  try {
    usuarios.value = await adminApi.usuarios();
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

async function crear() {
  try {
    await adminApi.crearUsuario(form.value);
    $q.notify({ type: 'positive', message: 'Usuario creado' });
    showDialog.value = false;
    form.value = { username: '', password: '', name: '', role: 'MOZO' };
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error al crear usuario' });
  }
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Usuarios</div>
      <q-space />
      <q-btn color="primary" icon="person_add" label="Nuevo" @click="showDialog = true" />
    </div>

    <q-inner-loading :showing="loading" />

    <q-table
      flat
      bordered
      dark
      :rows="usuarios"
      :columns="[
        { name: 'name', label: 'Nombre', field: 'name', align: 'left' },
        { name: 'username', label: 'Usuario', field: 'username', align: 'left' },
        { name: 'role', label: 'Rol', field: 'role', align: 'left' },
      ]"
      row-key="id"
    />

    <q-dialog v-model="showDialog">
      <q-card dark style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Nuevo usuario</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.name" label="Nombre" outlined dark />
          <q-input v-model="form.username" label="Usuario" outlined dark />
          <q-input v-model="form.password" label="Contraseña" type="password" outlined dark />
          <q-select
            v-model="form.role"
            :options="roles"
            label="Rol"
            outlined
            dark
            emit-value
            map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Crear" @click="crear" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
