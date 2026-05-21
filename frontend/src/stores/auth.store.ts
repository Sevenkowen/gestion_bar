import { defineStore } from 'pinia';
import { authApi } from '@/services/auth.api';
import { connectSocket, disconnectSocket } from '@/boot/socket';
import type { RoleName, User } from '@/types';

const STORAGE_TOKEN = 'accessToken';
const STORAGE_USER = 'user';

function loadUser(): User | null {
  const raw = localStorage.getItem(STORAGE_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(STORAGE_TOKEN),
    user: loadUser(),
    loading: false,
  }),

  getters: {
    isLoggedIn: (s) => !!s.token && !!s.user,
    role: (s) => s.user?.role,
    homeRoute: (s): string => {
      switch (s.user?.role) {
        case 'ADMIN':
          return '/admin';
        case 'CAJA':
          return '/caja';
        case 'MOZO':
          return '/mozos';
        default:
          return '/login';
      }
    },
  },

  actions: {
    hasRole(...roles: RoleName[]) {
      return !!this.user && roles.includes(this.user.role);
    },

    async login(username: string, password: string) {
      this.loading = true;
      try {
        const res = await authApi.login(username, password);
        this.token = res.accessToken;
        this.user = res.user;
        localStorage.setItem(STORAGE_TOKEN, res.accessToken);
        localStorage.setItem(STORAGE_USER, JSON.stringify(res.user));
        connectSocket(res.accessToken);
        return res.user;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      disconnectSocket();
      this.token = null;
      this.user = null;
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
    },

    restoreSession() {
      if (this.token) {
        connectSocket(this.token);
      }
    },
  },
});
