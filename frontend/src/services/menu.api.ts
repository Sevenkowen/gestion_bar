import api from './api';

export type MenuItemType = 'PRODUCT' | 'COMBO' | 'INSUMO';

export interface MenuItemRef {
  id: number;
  type: MenuItemType;
  price: string;
  sortOrder: number;
  visible: boolean;
  product?: { id: number; name: string; price: string; description?: string | null } | null;
  combo?: { id: number; name: string; price: string; description?: string | null } | null;
  ingredient?: { id: number; name: string; cost: string } | null;
  section?: { id: number; name: string };
}

export interface MenuSection {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
  items: MenuItemRef[];
}

export interface CartaMenuItem {
  id: number;
  type: MenuItemType;
  name: string;
  description: string | null;
  image: string | null;
  price: string;
  sortOrder: number;
  available: boolean;
}

export interface CartaSection {
  id: number;
  name: string;
  sortOrder: number;
  items: CartaMenuItem[];
}

export interface MenuItemForm {
  sectionId: number;
  type: MenuItemType;
  productId?: number;
  comboId?: number;
  ingredientId?: number;
  price: number;
  sortOrder?: number;
  visible?: boolean;
}

export const menuApi = {
  carta: () => api.get<CartaSection[]>('/menu/carta').then((r) => r.data),
  sections: () => api.get<MenuSection[]>('/menu/sections').then((r) => r.data),
  createSection: (data: { name: string; sortOrder?: number }) =>
    api.post<MenuSection>('/menu/sections', data).then((r) => r.data),
  updateSection: (id: number, data: { name?: string; sortOrder?: number; active?: boolean }) =>
    api.put<MenuSection>(`/menu/sections/${id}`, data).then((r) => r.data),
  removeSection: (id: number) => api.delete(`/menu/sections/${id}`).then((r) => r.data),
  createItem: (data: MenuItemForm) =>
    api.post<MenuItemRef>('/menu/items', data).then((r) => r.data),
  updateItem: (
    id: number,
    data: { sectionId?: number; price?: number; sortOrder?: number; visible?: boolean },
  ) => api.put<MenuItemRef>(`/menu/items/${id}`, data).then((r) => r.data),
  removeItem: (id: number) => api.delete(`/menu/items/${id}`).then((r) => r.data),
};
