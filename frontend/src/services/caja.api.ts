import api from './api';
import type { MesaPendiente, Payment, PaymentLine } from '@/types';

export const cajaApi = {
  mesasPendientes: () => api.get<MesaPendiente[]>('/caja/mesas-pendientes').then((r) => r.data),
  cobrar: (orderId: number, payments: PaymentLine[]) =>
    api.post(`/caja/cobrar/${orderId}`, { payments }).then((r) => r.data),
  historial: (date?: string) =>
    api.get<Payment[]>('/caja/historial', { params: date ? { date } : {} }).then((r) => r.data),
};
