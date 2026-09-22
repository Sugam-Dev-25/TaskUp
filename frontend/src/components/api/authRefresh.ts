import axios from 'axios';
import { tokenStore } from './tokenStore';

// Deduped across callers: if boardApiClient and userApiClient both get a
// 401 at the same moment, they share this one in-flight refresh instead of
// each firing their own POST /auth/refresh (which would race to rotate the
// same refresh-token cookie and could invalidate one of them).
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    // Raw axios, not userApiClient — going through userApiClient here would
    // re-trigger its own response interceptor and recurse.
    .post(
      `${import.meta.env.VITE_USER_API_URL}/auth/refresh`,
      {},
      { withCredentials: true } // sends the httpOnly refreshToken cookie; nothing else needed
    )
    .then((res) => {
      // Backend inconsistency: POST /auth/login returns `accessToken`,
      // POST /auth/refresh returns `access_token` (snake_case). Handle both
      // so this doesn't silently break if one of them changes.
      const newToken: string | null = res.data.access_token ?? res.data.accessToken ?? null;
      tokenStore.set(newToken);
      return newToken;
    })
    .catch((err) => {
      // No valid refresh cookie (expired, revoked, or never logged in) —
      // the session is genuinely over. Let the app know so it can redirect
      // to login, without this low-level module needing to import Redux.
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:sessionExpired'));
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
