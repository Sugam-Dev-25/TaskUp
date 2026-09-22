import axios from 'axios';
import { tokenStore } from './tokenStore';
import { refreshAccessToken } from './authRefresh';

const notificationApiClient = axios.create({
  baseURL: import.meta.env.VITE_NOTIFICATION_API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

notificationApiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

notificationApiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return notificationApiClient(originalRequest);
        }
      } catch {
        // handled in authRefresh.ts
      }
    }
    return Promise.reject(error);
  }
);

export default notificationApiClient;