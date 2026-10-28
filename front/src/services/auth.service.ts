import { api } from './api';
import { User, LoginRequest, RegisterRequest, AuthResponse, SharedOwner, SharedViewer } from '../types';

export const AuthService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);
    return res.data.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
    return res.data.data;
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/refresh', { refreshToken });
    return res.data.data;
  },

  async getProfile(): Promise<User> {
    const res = await api.get<{ success: boolean; data: User }>('/profile');
    return res.data.data;
  },

  async updateProfile(data: { name?: string; email?: string; username?: string }): Promise<User> {
    const res = await api.put<{ success: boolean; data: User }>('/profile', data);
    return res.data.data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    const res = await api.put<{ success: boolean; message: string }>('/profile/password', { oldPassword, newPassword });
    return res.data;
  },

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post<{ success: boolean; data: User }>('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  // ADMIN USERS
  async getUsers(): Promise<User[]> {
    const res = await api.get<{ success: boolean; data: User[] }>('/users');
    return res.data.data;
  },

  async updateUserRole(id: number, role: 'admin' | 'regular' | 'viewer'): Promise<User> {
    const res = await api.put<{ success: boolean; data: User }>(`/users/${id}/role`, { role });
    return res.data.data;
  },

  async deleteUser(id: number): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/users/${id}`);
    return res.data.success;
  },

  // SHARE MANAGEMENT
  async getSharedViewers(): Promise<SharedViewer[]> {
    const res = await api.get<{ success: boolean; data: SharedViewer[] }>('/share/viewers');
    return res.data.data;
  },

  async getSharedOwners(): Promise<SharedOwner[]> {
    const res = await api.get<{ success: boolean; data: SharedOwner[] }>('/share/owners');
    return res.data.data;
  },

  async addViewerByEmail(email: string): Promise<SharedViewer> {
    const res = await api.post<{ success: boolean; data: SharedViewer }>('/share/viewers', { email });
    return res.data.data;
  },

  async removeViewer(id: number): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/share/viewers/${id}`);
    return res.data.success;
  },
};
