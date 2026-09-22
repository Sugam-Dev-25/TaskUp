// Access token lives in memory only — never localStorage/sessionStorage.
// A plain module-level variable survives for the lifetime of the tab and
// is wiped on refresh/close, which is the point: if it's never written to
// disk, an XSS payload can't read it out of storage. Persistence across
// reloads comes from the httpOnly refresh-token cookie instead (see
// authRefresh.ts) — the browser can send that cookie automatically, but
// no JS on the page (ours or injected) can read its value.
let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
};
