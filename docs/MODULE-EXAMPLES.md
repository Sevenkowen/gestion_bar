# Ejemplos de módulos — SistemaBar

Este documento muestra patrones reales ya implementados en el backend y cómo se reflejan en el frontend.

---

## 1. Pedidos — enviar a cocina (backend)

El flujo crítico del MVP vive en `PedidosService.sendOrder`:

```typescript
// 1. Validar ítems en BORRADOR
// 2. Transacción: marcar ENVIADO + actualizar totales + mesa OCUPADA
// 3. Emitir evento order.items.sent (NO llamar stock/impresión directamente)

this.events.emit(DOMAIN_EVENTS.ORDER_ITEMS_SENT, payload);
```

**Suscriptores del evento:**
- `StockService.handleOrderSent` → descuenta ingredientes
- `ImpresionService.handleOrderSent` → crea PrintJobs
- `EventsGateway.handleOrderSent` → notifica vía WebSocket

---

## 2. Stock — descuento por receta y combo

```typescript
// Combo Burger = Doble Cheese + Papas + Coca
// Al vender 1 combo:
expandItemToProducts() → [
  { productId: dobleCheese, quantity: 1 },
  { productId: papasGrandes, quantity: 1 },
  { productId: coca, quantity: 1 },
]
// Cada producto aplica su ProductIngredient[]
// Pan -1, Medallón -2, Cheddar -4, Papas -300g, Coca Cola -1
```

Los combos **nunca** tienen receta propia — solo agrupan productos.

---

## 3. Impresión — separación cocina/barra

```typescript
// Producto.printSector determina destino
Doble Cheese  → COCINA → PrintJob COMANDA_COCINA
Coca Cola     → BARRA  → PrintJob COMANDA_BARRA
Servilletas   → NINGUNO → no se imprime
```

El combo expande sus productos internos; cada uno va a su sector.

---

## 4. Frontend — Store Pinia (mozos)

```typescript
// stores/mesas.store.ts
import { defineStore } from 'pinia';
import { mesasApi } from '@/shared/services/mesas.api';
import { useSocket } from '@/shared/composables/useSocket';

export const useMesasStore = defineStore('mesas', {
  state: () => ({
    mesas: [] as Mesa[],
    loading: false,
  }),

  actions: {
    async fetchMesas() {
      this.loading = true;
      this.mesas = await mesasApi.list();
      this.loading = false;
    },

    subscribeRealtime() {
      const socket = useSocket();
      socket.on('mesa:updated', (payload) => {
        const idx = this.mesas.findIndex((m) => m.id === payload.tableId);
        if (idx >= 0) {
          this.mesas[idx] = { ...this.mesas[idx], status: payload.status };
        }
      });
    },

    async abrirMesa(tableId: number) {
      return mesasApi.abrir(tableId);
    },
  },
});
```

---

## 5. Frontend — Composable Socket.IO

```typescript
// composables/useSocket.ts
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/shared/stores/auth.store';

let socket: Socket | null = null;

export function useSocket() {
  const auth = useAuthStore();

  if (!socket && auth.token) {
    socket = io(`${import.meta.env.VITE_API_URL}/events`, {
      auth: { token: auth.token },
      transports: ['websocket'],
    });
  }

  return socket!;
}
```

---

## 6. Frontend — Página mozo (tomar pedido)

```vue
<!-- apps/mozos/pages/MesaPage.vue -->
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePedidoStore } from '@/shared/stores/pedido.store';
import { useQuasar } from 'quasar';

const route = useRoute();
const pedido = usePedidoStore();
const $q = useQuasar();

const tableId = computed(() => Number(route.params.id));

onMounted(() => pedido.loadByTable(tableId.value));

async function enviarPedido() {
  try {
    await pedido.enviar();
    $q.notify({ type: 'positive', message: 'Pedido enviado a cocina' });
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al enviar pedido' });
  }
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row q-gutter-md">
      <div class="col-8">
        <q-list bordered separator>
          <q-item v-for="item in pedido.items" :key="item.id">
            <q-item-section>{{ item.product?.name ?? item.combo?.name }}</q-item-section>
            <q-item-section side>{{ item.quantity }}x</q-item-section>
            <q-item-section side>${{ item.subtotal }}</q-item-section>
          </q-item>
        </q-list>
      </div>
      <div class="col-4">
        <q-btn color="primary" size="lg" class="full-width" label="Enviar pedido" @click="enviarPedido" />
        <q-btn color="secondary" size="lg" class="full-width q-mt-md" label="Pedir cuenta" @click="pedido.pedirCuenta()" />
      </div>
    </div>
  </q-page>
</template>
```

---

## 7. API REST — endpoints MVP

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/auth/login` | público | Login |
| GET | `/mesas` | mozo,caja,admin | Listar mesas |
| POST | `/mesas/:id/abrir` | mozo | Abrir mesa |
| GET | `/pedidos/mesa/:tableId` | mozo | Pedido activo |
| POST | `/pedidos/:id/items` | mozo | Agregar ítem |
| POST | `/pedidos/:id/enviar` | mozo | Enviar a cocina |
| POST | `/pedidos/:id/cuenta` | mozo | Pedir cuenta |
| GET | `/caja/mesas-pendientes` | caja | Mesas a cobrar |
| POST | `/caja/cobrar/:orderId` | caja | Cobrar |
| GET | `/productos/disponibles` | mozo | Carta disponible |
| GET | `/combos` | mozo | Combos |
| GET | `/admin/dashboard` | admin | Resumen |

Swagger completo: `http://localhost:3000/api/docs`

---

## 8. Datos de ejemplo (seed)

Tras `npm run prisma:seed`:

| Entidad | Ejemplo |
|---------|---------|
| Usuario admin | admin / admin123 |
| Mozo | mozo1 / mozo123 |
| Caja | caja1 / caja123 |
| Producto | Doble Cheese — $4500 — cocina |
| Combo | Combo Burger — $6500 |
| Ingredientes | Pan, Medallón, Cheddar, Papas, Coca Cola |
| Mesas | 1-12 |
| Impresoras | Cocina 192.168.1.100:9100, Barra 192.168.1.101:9100 |

---

## 9. Test de integración sugerido

```typescript
describe('Pedido → Stock → Impresión', () => {
  it('enviar combo descuenta ingredientes y crea 2 print jobs', async () => {
    const order = await abrirMesa(1);
    await addItem(order.id, { comboId: 1, quantity: 1 });
    const panBefore = await getStock('Pan');

    await sendOrder(order.id);

    const panAfter = await getStock('Pan');
    expect(panAfter).toBe(panBefore - 1);

    const jobs = await getPrintJobs(order.id);
    expect(jobs).toHaveLength(2); // cocina + barra
    expect(jobs.map(j => j.sector)).toContain('COCINA');
    expect(jobs.map(j => j.sector)).toContain('BARRA');
  });
});
```
