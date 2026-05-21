import api from './api';
import type { DashboardStats, User, RoleName } from '@/types';

export const adminApi = {
  dashboard: () => api.get<DashboardStats>('/admin/dashboard').then((r) => r.data),
  usuarios: () => api.get<User[]>('/users').then((r) => r.data),
  crearUsuario: (data: { username: string; password: string; name: string; role: RoleName }) =>
    api.post('/users', data).then((r) => r.data),
};
