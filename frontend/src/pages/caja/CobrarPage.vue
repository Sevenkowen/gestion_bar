<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { cajaApi } from '@/services/caja.api';
import { getSocket } from '@/boot/socket';
import PedidoItemsList from '@/components/PedidoItemsList.vue';
import { formatMoney, paymentMethodLabel } from '@/utils/format';
import type { MesaPendiente, PaymentMethod } from '@/types';

const $q = useQuasar();
const mesas = ref<MesaPendiente[]>([]);
const loading = ref(false);
const selected = ref<MesaPendiente | null>(null);
const method = ref<PaymentMethod>('EFECTIVO');
const cobrando = ref(false);

async function load() {
  loading.value = true;
  try {
    mesas.value = await cajaApi.mesasPendientes();
    if (selected.value) {
      selected.value = mesas.value.find((m: MesaPendiente) => m.id === selected.value!.id) ?? null;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await load();
  const socket = getSocket();
  socket?.on('caja:mesa-cobrada', () => void load());
  socket?.on('mesa:updated', () => void load());
});

async function cobrar() {
  if (!selected.value?.orders[0]) return;
  const order = selected.value.orders[0];
  cobrando.value = true;
  try {
    await cajaApi.cobrar(order.id, [
      { method: method.value, amount: parseFloat(order.total) },
    ]);
    $q.notify({ type: 'positive', message: 'Cobro registrado' });
    selected.value = null;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error al cobrar' });
  } finally {
    cobrando.value = false;
  }
}

const paymentMethods = Object.entries(paymentMethodLabel).map(([value, label]) => ({
  value: value as PaymentMethod,
  label,
}));
</script>

<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Cobrar mesas</div>

    <q-inner-loading :showing="loading" />

    <div v-if="!mesas.length && !loading" class="text-center text-grey-5 q-pa-xl">
      <q-icon name="check_circle_outline" size="64px" />
      <div class="q-mt-md">No hay mesas pendientes de cobro</div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-list bordered separator class="rounded-borders">
          <q-item
            v-for="mesa in mesas"
            :key="mesa.id"
            clickable
            v-ripple
            :active="selected?.id === mesa.id"
            active-class="bg-grey-9"
            @click="selected = mesa"
          >
            <q-item-section avatar>
              <q-avatar color="info" text-color="white">{{ mesa.number }}</q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ mesa.name ?? `Mesa ${mesa.number}` }}</q-item-label>
              <q-item-label caption>Mozo: {{ mesa.orders[0]?.waiter?.name }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label class="text-amber">
                {{ formatMoney(mesa.orders[0]?.total ?? 0) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div v-if="selected?.orders[0]" class="col-12 col-md-8">
        <q-card flat bordered class="bg-grey-10">
          <q-card-section>
            <div class="text-h6">
              Mesa {{ selected.number }} — {{ formatMoney(selected.orders[0].total) }}
            </div>
          </q-card-section>
          <q-card-section>
            <PedidoItemsList :items="selected.orders[0].items" />
          </q-card-section>
          <q-card-section>
            <q-select
              v-model="method"
              :options="paymentMethods"
              label="Método de pago"
              outlined
              dark
              emit-value
              map-options
            />
          </q-card-section>
          <q-card-actions class="q-pa-md">
            <q-btn
              color="positive"
              label="Cobrar y cerrar mesa"
              icon="payments"
              size="lg"
              class="full-width"
              :loading="cobrando"
              @click="cobrar"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
