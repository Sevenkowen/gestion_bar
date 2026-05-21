import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from '@/stores/auth.store';

export default defineRouter(({ store }) => {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to) => {
    const auth = useAuthStore(store);

    if (to.meta.public) {
      if (auth.isLoggedIn && to.path === '/login') {
        return auth.homeRoute;
      }
      return true;
    }

    if (!auth.isLoggedIn) {
      return '/login';
    }

    const roles = to.meta.roles;
    if (roles?.length && !auth.hasRole(...roles)) {
      return auth.homeRoute;
    }

    return true;
  });

  const auth = useAuthStore(store);
  auth.restoreSession();

  return Router;
});
