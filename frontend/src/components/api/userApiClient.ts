import axios from 'axios';
import { tokenStore } from './tokenStore';
import { refreshAccessToken } from './authRefresh';

// Points at the standalone user-service (split out of the old monolith).
// Same shape as axiosClient.ts — only the base URL differs.
const userApiClient = axios.create({
  baseURL: import.meta.env.VITE_USER_API_URL,
  withCredentials: true, // still needed so the httpOnly refreshToken cookie rides along on /auth/* calls
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  },
  
});

// requireAuth only reads Authorization: Bearer <token> (never cookies for
// the access token) — attach it from the in-memory store on every request.
userApiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Access tokens expire after 15 minutes (ACCESS_TOKEN_EXPIRE_MINUTES). When
// one does, the first request after that gets a 401 — catch it, refresh
// using the httpOnly cookie, and silently retry the original request once
// so the caller never sees the expiry.
userApiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/refresh') || originalRequest?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return userApiClient(originalRequest);
        }
      } catch {
        // refreshAccessToken already cleared the token store and fired
        // auth:sessionExpired — just fall through to reject below.
      }
    }
    return Promise.reject(error);
  }
);

export default userApiClient;
