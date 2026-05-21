import api from './api';
import type { Product, PrintSector } from '@/types';

export interface RecipeLine {
  ingredientId: number;
  quantity: number;
}

export interface ProductForm {
  name: string;
  description?: string;
  price: number;
  categoryId: number;
  printSector: PrintSector;
  manualAvailable?: boolean;
  recipe?: RecipeLine[];
}

export const productosApi = {
  disponibles: () => api.get<Product[]>('/productos/disponibles').then((r) => r.data),
  list: () => api.get<Product[]>('/productos').then((r) => r.data),
  get: (id: number) => api.get<Product>(`/productos/${id}`).then((r) => r.data),
  create: (data: ProductForm) => api.post<Product>('/productos', data).then((r) => r.data),
  update: (id: number, data: Partial<ProductForm> & { active?: boolean }) =>
    api.put<Product>(`/productos/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/productos/${id}`).then((r) => r.data),
};
