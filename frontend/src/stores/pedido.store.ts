import { defineStore } from 'pinia';
import { pedidosApi } from '@/services/pedidos.api';
import { menuApi, type CartaSection } from '@/services/menu.api';
import type { Order, OrderItem } from '@/types';

export const usePedidoStore = defineStore('pedido', {
  state: () => ({
    order: null as Order | null,
    carta: [] as CartaSection[],
    loading: false,
    tableId: null as number | null,
  }),

  getters: {
    borradorItems: (s): OrderItem[] => s.order?.items.filter((i: OrderItem) => i.status === 'BORRADOR') ?? [],
    enviadosItems: (s): OrderItem[] => s.order?.items.filter((i: OrderItem) => i.status !== 'BORRADOR') ?? [],
    total: (s) => s.order?.total ?? '0',
    canEdit: (s) => s.order?.status === 'ABIERTO',
    canSend: (s) => (s.order?.items.some((i: OrderItem) => i.status === 'BORRADOR') ?? false) && s.order?.status === 'ABIERTO',
    canPedirCuenta: (s) => s.order?.status === 'ENVIADO',
  },

  actions: {
    async loadByTable(tableId: number) {
      this.tableId = tableId;
      this.loading = true;
      try {
        this.order = await pedidosApi.byMesa(tableId);
      } finally {
        this.loading = false;
      }
    },

    async loadCarta() {
      this.carta = await menuApi.carta();
    },

    async addMenuItem(menuItemId: number, quantity = 1) {
      if (!this.order) return;
      await pedidosApi.addItem(this.order.id, { menuItemId, quantity });
      await this.loadByTable(this.tableId!);
    },

    async enviar() {
      if (!this.order) return;
      this.order = await pedidosApi.enviar(this.order.id);
    },

    async updateItemQuantity(itemId: number, quantity: number) {
      if (!this.order) return;
      await pedidosApi.updateItem(this.order.id, itemId, quantity);
      await this.loadByTable(this.tableId!);
    },

    async removeItem(itemId: number) {
      if (!this.order) return;
      await pedidosApi.removeItem(this.order.id, itemId);
      await this.loadByTable(this.tableId!);
    },

    async pedirCuenta() {
      if (!this.order) return;
      await pedidosApi.pedirCuenta(this.order.id);
      await this.loadByTable(this.tableId!);
    },

    clear() {
      this.order = null;
      this.tableId = null;
    },
  },
});
