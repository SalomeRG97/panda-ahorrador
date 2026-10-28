import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginRequest, RegisterRequest } from '../types';
import { AuthService } from '../services/auth.service';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  userRole: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  hasRole: (...roles: string[]) => boolean;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const userData = localStorage.getItem('panda_user');
    const token = localStorage.getItem('panda_access_token');
    if (userData && token) {
      try {
        return JSON.parse(userData);
      } catch {
        localStorage.removeItem('panda_user');
        localStorage.removeItem('panda_access_token');
        localStorage.removeItem('panda_refresh_token');
        return null;
      }
    }
    return null;
  });

  const isAuthenticated = !!currentUser;
  const userRole = currentUser?.role || null;

  const handleAuthSuccess = (data: { accessToken: string; refreshToken: string; user: User }) => {
    localStorage.setItem('panda_access_token', data.accessToken);
    localStorage.setItem('panda_refresh_token', data.refreshToken);
    localStorage.setItem('panda_user', JSON.stringify(data.user));
    setCurrentUser(data.user);
  };

  const login = async (credentials: LoginRequest) => {
    const data = await AuthService.login(credentials);
    handleAuthSuccess(data);
  };

  const register = async (data: RegisterRequest) => {
    const resData = await AuthService.register(data);
    handleAuthSuccess(resData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('panda_access_token');
    localStorage.removeItem('panda_refresh_token');
    localStorage.removeItem('panda_user');
    setCurrentUser(null);
  }, []);

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
        userRole,
        login,
        register,
        logout,
        updateUser,
        hasRole,
        reloadProfile,
      }}
    >
      {children}
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
