import type { RouteRecordRaw } from 'vue-router';
import type { RoleName } from '@/types';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    roles?: RoleName[];
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const raw = localStorage.getItem('user');
      if (!raw) return '/login';
      try {
        const user = JSON.parse(raw) as { role: RoleName };
        if (user.role === 'ADMIN') return '/admin';
        if (user.role === 'CAJA') return '/caja';
        return '/mozos';
      } catch {
        return '/login';
      }
    },
  },

  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { public: true },
    children: [{ path: '', component: () => import('pages/LoginPage.vue') }],
  },

  {
    path: '/mozos',
    component: () => import('layouts/MozosLayout.vue'),
    meta: { roles: ['MOZO', 'ADMIN'] },
    children: [
      { path: '', component: () => import('pages/mozos/MesasPage.vue') },
      { path: 'mesa/:id', component: () => import('pages/mozos/MesaPage.vue') },
    ],
  },

  {
    path: '/caja',
    component: () => import('layouts/CajaLayout.vue'),
    meta: { roles: ['CAJA', 'ADMIN'] },
    children: [
      { path: '', component: () => import('pages/caja/CobrarPage.vue') },
      { path: 'historial', component: () => import('pages/caja/HistorialPage.vue') },
    ],
  },

  {
    path: '/admin',
    component: () => import('layouts/AdminLayout.vue'),
    meta: { roles: ['ADMIN'] },
    children: [
      { path: '', component: () => import('pages/admin/DashboardPage.vue') },
      { path: 'productos', component: () => import('pages/admin/ProductosPage.vue') },
      { path: 'combos', component: () => import('pages/admin/CombosPage.vue') },
      { path: 'menu', component: () => import('pages/admin/MenuPage.vue') },
      { path: 'categorias', component: () => import('pages/admin/CategoriasPage.vue') },
      { path: 'insumos', component: () => import('pages/admin/InsumosPage.vue') },
      { path: 'mesas', component: () => import('pages/admin/MesasPage.vue') },
      { path: 'impresoras', component: () => import('pages/admin/ImpresorasPage.vue') },
      { path: 'usuarios', component: () => import('pages/admin/UsuariosPage.vue') },
    ],
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
