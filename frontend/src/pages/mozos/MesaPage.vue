<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { usePedidoStore } from '@/stores/pedido.store';
import { useMesasStore } from '@/stores/mesas.store';
import ProductCard from '@/components/ProductCard.vue';
import PedidoItemsList from '@/components/PedidoItemsList.vue';
import { formatMoney } from '@/utils/format';
import type { OrderItem } from '@/types';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const pedido = usePedidoStore();
const mesas = useMesasStore();

const tableId = computed(() => Number(route.params.id));
const opening = ref(false);
const sending = ref(false);

function itemLabel(item: OrderItem) {
  return item.product?.name ?? item.combo?.name ?? item.ingredient?.name ?? 'Ítem';
}

onMounted(async () => {
  await pedido.loadCarta();
  await pedido.loadByTable(tableId.value);
});

async function abrirMesa() {
  opening.value = true;
  try {
    await mesas.abrirMesa(tableId.value);
    await pedido.loadByTable(tableId.value);
    $q.notify({ type: 'positive', message: 'Mesa abierta' });
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo abrir la mesa' });
  } finally {
    opening.value = false;
  }
}

async function addMenuItem(menuItemId: number) {
  try {
    await pedido.addMenuItem(menuItemId);
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    $q.notify({ type: 'negative', message: msg ?? 'Error al agregar' });
  }
}

async function enviarPedido() {
  sending.value = true;
  try {
    await pedido.enviar();
    $q.notify({ type: 'positive', message: 'Pedido enviado a cocina/barra' });
  } catch {
    $q.notify({ type: 'negative', message: 'Error al enviar pedido' });
  } finally {
    sending.value = false;
  }
}

async function pedirCuenta() {
  try {
    await pedido.pedirCuenta();
    $q.notify({ type: 'info', message: 'Cuenta pedida — avisá a caja' });
    void router.push('/mozos');
  } catch {
    $q.notify({ type: 'negative', message: 'Error al pedir cuenta' });
  }
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" @click="router.push('/mozos')" />
      <div class="text-h5 q-ml-sm">Mesa {{ tableId }}</div>
    </div>

    <div v-if="!pedido.order && !pedido.loading" class="text-center q-pa-xl">
      <q-icon name="table_restaurant" size="64px" color="grey-6" />
      <div class="text-h6 q-mt-md">Mesa libre</div>
      <q-btn
        color="primary"
        label="Abrir mesa"
        class="q-mt-lg"
        size="lg"
        :loading="opening"
        @click="abrirMesa"
      />
    </div>

    <q-inner-loading :showing="pedido.loading" />

    <div v-if="pedido.order" class="row q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-card flat bordered class="bg-grey-10">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold">
              Pedido #{{ pedido.order.id }}
              <q-badge :label="pedido.order.status" class="q-ml-sm" />
            </div>
            <div class="text-h5 text-amber q-mt-sm">{{ formatMoney(pedido.total) }}</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div v-if="pedido.canEdit" class="text-subtitle2 text-amber q-mb-sm">Borrador</div>
            <q-list v-if="pedido.canEdit" dense bordered separator class="rounded-borders q-mb-md">
              <q-item v-for="item in pedido.borradorItems" :key="item.id">
                <q-item-section>
                  <q-item-label>{{ itemLabel(item) }}</q-item-label>
                  <q-item-label caption>{{ formatMoney(item.subtotal) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row items-center q-gutter-xs">
                    <q-btn flat dense round icon="remove" size="sm" :disable="item.quantity <= 1" @click="pedido.updateItemQuantity(item.id, item.quantity - 1)" />
                    <span class="text-weight-bold">{{ item.quantity }}</span>
                    <q-btn flat dense round icon="add" size="sm" @click="pedido.updateItemQuantity(item.id, item.quantity + 1)" />
                    <q-btn flat dense round icon="delete" size="sm" color="negative" @click="pedido.removeItem(item.id)" />
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="!pedido.borradorItems.length">
                <q-item-section class="text-grey-5">Sin ítems en borrador</q-item-section>
              </q-item>
            </q-list>

            <PedidoItemsList
              v-if="pedido.enviadosItems.length"
              :items="pedido.enviadosItems"
              title="Enviados"
            />
          </q-card-section>

          <q-card-actions vertical class="q-pa-md q-gutter-sm">
            <q-btn
              v-if="pedido.canSend"
              color="primary"
              label="Enviar pedido"
              icon="send"
              class="full-width"
              :loading="sending"
              @click="enviarPedido"
            />
            <q-btn
              v-if="pedido.canPedirCuenta"
              color="info"
              label="Pedir cuenta"
              icon="receipt_long"
              class="full-width"
              outline
              @click="pedirCuenta"
            />
          </q-card-actions>
        </q-card>
      </div>

      <div v-if="pedido.canEdit" class="col-12 col-md-8">
        <div v-if="!pedido.carta.length" class="text-center text-grey-5 q-pa-xl">
          <q-icon name="restaurant_menu" size="48px" />
          <div class="q-mt-md">El menú está vacío. Configuralo desde Admin → Menú.</div>
        </div>

        <div v-for="section in pedido.carta" :key="section.id" class="q-mb-lg">
          <div class="text-subtitle1 text-amber q-mb-sm">{{ section.name }}</div>
          <div class="row q-col-gutter-sm">
            <div v-for="item in section.items" :key="item.id" class="col-6 col-sm-4 col-md-3">
              <ProductCard
                :name="item.name"
                :price="item.price"
                :subtitle="item.description || ''"
                @add="addMenuItem(item.id)"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="col-12 col-md-8 flex flex-center">
        <div class="text-grey-5 text-center q-pa-xl">
          <q-icon name="check_circle" size="48px" color="positive" />
          <div class="q-mt-md">Pedido enviado. Esperando cierre de caja.</div>
        </div>
      </div>
    </div>
  </q-page>
</template>
