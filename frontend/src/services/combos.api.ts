import api from './api';
import type { Combo } from '@/types';

export interface ComboForm {
  name: string;
  description?: string;
  price: number;
  products: { productId: number; quantity: number }[];
}

export const combosApi = {
  list: () => api.get<Combo[]>('/combos').then((r) => r.data),
  create: (data: ComboForm) => api.post<Combo>('/combos', data).then((r) => r.data),
  update: (id: number, data: Partial<ComboForm> & { active?: boolean }) =>
    api.put<Combo>(`/combos/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/combos/${id}`).then((r) => r.data),
};
