import api from './api';
import type { Mesa } from '@/types';

export const mesasApi = {
  list: () => api.get<Mesa[]>('/mesas').then((r) => r.data),
  listAdmin: () => api.get<Mesa[]>('/mesas/admin').then((r) => r.data),
  abrir: (id: number) => api.post(`/mesas/${id}/abrir`).then((r) => r.data),
  create: (data: { number: number; name?: string; capacity?: number }) =>
    api.post<Mesa>('/mesas', data).then((r) => r.data),
  update: (id: number, data: { name?: string; capacity?: number; active?: boolean }) =>
    api.put<Mesa>(`/mesas/${id}`, data).then((r) => r.data),
};
