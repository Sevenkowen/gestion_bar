import api from './api';
import type { Ingredient, IngredientKind } from '@/types';

export type UnitType = 'UNIDAD' | 'GRAMO' | 'KILO' | 'ML' | 'LITRO';

export const stockApi = {
  ingredientes: (kind?: IngredientKind) =>
    api
      .get<Ingredient[]>('/stock/ingredientes', { params: kind ? { kind } : undefined })
      .then((r) => r.data),
  createIngrediente: (data: {
    name: string;
    unit: UnitType;
    kind?: IngredientKind;
    currentStock?: number;
    minStock?: number;
    cost?: number;
  }) => api.post<Ingredient>('/stock/ingredientes', data).then((r) => r.data),
  updateIngrediente: (id: number, data: {
    name?: string;
    unit?: UnitType;
    kind?: IngredientKind;
    minStock?: number;
    cost?: number;
    active?: boolean;
  }) => api.put<Ingredient>(`/stock/ingredientes/${id}`, data).then((r) => r.data),
  ajustarStock: (id: number, quantity: number, notes?: string) =>
    api.post<Ingredient>(`/stock/ingredientes/${id}/ajustar`, { quantity, notes }).then((r) => r.data),
  recalcular: () => api.post('/stock/recalcular-disponibilidad').then((r) => r.data),
};
