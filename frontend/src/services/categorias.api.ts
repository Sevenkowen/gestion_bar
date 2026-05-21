import api from './api';
import type { Category } from '@/types';

export const categoriasApi = {
  list: () => api.get<Category[]>('/categorias').then((r) => r.data),
  create: (data: { name: string; sortOrder?: number }) =>
    api.post<Category>('/categorias', data).then((r) => r.data),
  update: (id: number, data: Partial<Category>) =>
    api.put<Category>(`/categorias/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/categorias/${id}`).then((r) => r.data),
};
