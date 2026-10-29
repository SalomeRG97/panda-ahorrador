import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { AuthService } from '../services/auth.service';
import { setAccessToken, registerAuthCallbacks } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: string | null;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateUser: (user: User) => void;
  hasRole: (...roles: string[]) => boolean;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAuthenticated = !!currentUser;
  const userRole = currentUser?.role || null;

  const clearLocalSession = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem('panda_user');
    setCurrentUser(null);
  }, []);

  const handleAuthSuccess = useCallback((data: { accessToken: string; user: User; mustChangePassword?: boolean }) => {
    const normalizedUser: User = {
      ...data.user,
      mustChangePassword: Boolean(data.mustChangePassword ?? data.user?.mustChangePassword),
    };
    setAccessToken(data.accessToken);
    localStorage.setItem('panda_user', JSON.stringify(normalizedUser));
    setCurrentUser(normalizedUser);
  }, []);

  useEffect(() => {
    registerAuthCallbacks({
      onRefresh: ({ accessToken, user }) => {
        setAccessToken(accessToken);
        setCurrentUser(user);
      },
      onFailure: () => {
        clearLocalSession();
      },
    });
  }, [clearLocalSession]);

  // Al cargar la app, intenta recuperar la sesión desde la cookie httpOnly (/auth/refresh)
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const data = await AuthService.refreshToken();
        if (isMounted) {
          handleAuthSuccess(data);
        }
      } catch {
        if (isMounted) {
          clearLocalSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
  }, [handleAuthSuccess, clearLocalSession]);

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    const data = await AuthService.login(credentials);
    handleAuthSuccess(data);
    return data;
  };

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    const resData = await AuthService.register(data);
    handleAuthSuccess(resData);
    return resData;
  };

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } catch {
      // Ignorar errores de red al cerrar sesión para limpiar siempre el cliente
    } finally {
      clearLocalSession();
    }
  }, [clearLocalSession]);

  const logoutAll = useCallback(async () => {
    try {
      await AuthService.logoutAll();
    } finally {
      clearLocalSession();
    }
  }, [clearLocalSession]);

  const updateUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('panda_user', JSON.stringify(user));
  };

  const reloadProfile = async () => {
    try {
      const user = await AuthService.getProfile();
      updateUser(user);
    } catch (err) {
      console.error('Error al recargar perfil:', err);
    }
  };

  const hasRole = (...roles: string[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        userRole,
        login,
        register,
        logout,
        logoutAll,
        updateUser,
        hasRole,
        reloadProfile,
      }}
    >
      {isLoading ? (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: '#FFF8FA',
            color: '#D4566A',
            fontFamily: 'Comfortaa, cursive',
          }}
        >
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          <span>Recuperando sesión del Panda Ahorrador... 🌸</span>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
