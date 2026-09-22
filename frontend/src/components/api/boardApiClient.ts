import axios from 'axios';
import { tokenStore } from './tokenStore';
import { refreshAccessToken } from './authRefresh';

// Points at the standalone board-service (boards/columns/tasks, split out
// of the old monolith). Same shape as axiosClient.ts — only the base URL differs.
const boardApiClient = axios.create({
  baseURL: import.meta.env.VITE_BOARD_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// board-service verifies the same access token user-service issues (same
// JWT_SECRET_KEY), read from Authorization: Bearer — attach it here too.
boardApiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Same refresh-and-retry-once flow as userApiClient. refreshAccessToken()
// is shared, so a 401 here and a 401 on userApiClient at the same moment
// dedupe into a single POST /auth/refresh instead of firing two.
boardApiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return boardApiClient(originalRequest);
        }
      } catch {
        // handled in authRefresh.ts (token cleared, auth:sessionExpired fired)
      }
    }
    return Promise.reject(error);
  }
);

export default boardApiClient;
