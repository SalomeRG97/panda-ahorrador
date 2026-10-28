import axios from 'axios';
import { API_BASE_URL } from '../config/environment';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para agregar token JWT en las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('panda_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejar respuestas 401 y refrescar token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('panda_refresh_token');
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          if (res.data?.success && res.data?.data) {
            const { accessToken, refreshToken: newRefreshToken, user } = res.data.data;
            localStorage.setItem('panda_access_token', accessToken);
            localStorage.setItem('panda_refresh_token', newRefreshToken);
            localStorage.setItem('panda_user', JSON.stringify(user));
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          // Si falla el refresh token, cerrar sesión
          localStorage.removeItem('panda_access_token');
          localStorage.removeItem('panda_refresh_token');
          localStorage.removeItem('panda_user');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      } else {
        localStorage.removeItem('panda_access_token');
        localStorage.removeItem('panda_refresh_token');
        localStorage.removeItem('panda_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
