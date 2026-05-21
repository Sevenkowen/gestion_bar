import { defineStore } from 'pinia';
import { mesasApi } from '@/services/mesas.api';
import { getSocket } from '@/boot/socket';
import type { Mesa, TableStatus } from '@/types';

export const useMesasStore = defineStore('mesas', {
  state: () => ({
    mesas: [] as Mesa[],
    loading: false,
  }),

  actions: {
    async fetchMesas() {
      this.loading = true;
      try {
        this.mesas = await mesasApi.list();
      } finally {
        this.loading = false;
      }
    },

    updateMesaStatus(tableId: number, status: TableStatus) {
      const mesa = this.mesas.find((m: Mesa) => m.id === tableId);
      if (mesa) {
        mesa.status = status;
      }
    },

    subscribeRealtime() {
      const socket = getSocket();
      if (!socket) return;

      socket.off('mesa:updated');
      socket.on('mesa:updated', (payload: { tableId: number; status: TableStatus }) => {
        this.updateMesaStatus(payload.tableId, payload.status);
      });
    },

    async abrirMesa(id: number) {
      const order = await mesasApi.abrir(id);
      await this.fetchMesas();
      return order;
    },
  },
});
