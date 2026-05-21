import api from './api';
import type { Order } from '@/types';

export const pedidosApi = {
  byMesa: (tableId: number) =>
    api.get<Order | null>(`/pedidos/mesa/${tableId}`).then((r) => r.data),
  addItem: (
    orderId: number,
    data: { productId?: number; comboId?: number; menuItemId?: number; quantity: number; notes?: string },
  ) => api.post(`/pedidos/${orderId}/items`, data).then((r) => r.data),
  enviar: (orderId: number) => api.post<Order>(`/pedidos/${orderId}/enviar`).then((r) => r.data),
  pedirCuenta: (orderId: number) => api.post(`/pedidos/${orderId}/cuenta`).then((r) => r.data),
  updateItem: (orderId: number, itemId: number, quantity: number) =>
    api.put(`/pedidos/${orderId}/items/${itemId}`, { quantity }).then((r) => r.data),
  removeItem: (orderId: number, itemId: number) =>
    api.delete(`/pedidos/${orderId}/items/${itemId}`).then((r) => r.data),
};
