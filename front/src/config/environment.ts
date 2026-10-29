export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

// Origen del servidor backend (removiendo el sufijo /api)
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const getAvatarUrl = (avatar?: string | null): string => {
  if (!avatar) return '/logo.png';
  if (avatar.startsWith('http')) return avatar;
  return `${SERVER_ORIGIN}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
};
