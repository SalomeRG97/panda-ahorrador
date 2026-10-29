import axios from 'axios';
import { API_BASE_URL } from '../config/environment';
import { User } from '../types';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Access token almacenado únicamente en memoria (variable de módulo)
let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

type AuthRefreshCallback = (data: { accessToken: string; user: User }) => void;
type AuthFailureCallback = () => void;

let onAuthRefresh: AuthRefreshCallback | null = null;
let onAuthFailure: AuthFailureCallback | null = null;

export const registerAuthCallbacks = (callbacks: {
  onRefresh?: AuthRefreshCallback;
  onFailure?: AuthFailureCallback;
}): void => {
  onAuthRefresh = callbacks.onRefresh || null;
  onAuthFailure = callbacks.onFailure || null;
};

// Control de una única petición de refresh en vuelo y cola de espera para 401 concurrentes
let isRefreshing = false;
let refreshPromise: Promise<{ accessToken: string; user: User }> | null = null;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((pending) => {
    if (error || !token) {
      pending.reject(error);
    } else {
      pending.resolve(token);
    }
  });
  failedQueue = [];
};

export const refreshAccessToken = (): Promise<{ accessToken: string; user: User }> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = axios
    .post<{ success: boolean; data: { accessToken: string; user: User } }>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    )
    .then((res) => {
      if (!res.data?.success || !res.data?.data?.accessToken) {
        throw new Error('Respuesta de refresh inválida');
      }
      const { accessToken: newAccessToken, user } = res.data.data;
      setAccessToken(newAccessToken);
      localStorage.setItem('panda_user', JSON.stringify(user));
      if (onAuthRefresh) {
        onAuthRefresh({ accessToken: newAccessToken, user });
      }
      processQueue(null, newAccessToken);
      return { accessToken: newAccessToken, user };
    })
    .catch((err) => {
      setAccessToken(null);
      localStorage.removeItem('panda_user');
      processQueue(err, null);
      throw err;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
};

// Interceptor para agregar el access token desde memoria en las peticiones
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const AUTH_BYPASS_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// Interceptor para manejar respuestas 401 con una sola petición de refresh en vuelo
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthBypass = AUTH_BYPASS_PATHS.some((path) =>
      originalRequest.url?.includes(path)
    );

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED'
    ) {
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/change-password'
      ) {
        window.location.href = '/change-password';
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthBypass) {
      if (isRefreshing) {
        originalRequest._retry = true;
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;

      try {
        const { accessToken: newAccessToken } = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        if (onAuthFailure) {
          onAuthFailure();
        }
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/register'
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
