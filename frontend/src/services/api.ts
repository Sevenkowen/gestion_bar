import axios from 'axios';

const apiRoot = import.meta.env.VITE_API_URL?.trim() || '';
const baseURL = apiRoot ? `${apiRoot}/api/v1` : '/api/v1';

const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login';
      }
    }
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  },
);

export default api;
