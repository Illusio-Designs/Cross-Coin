import axios from 'axios';
import { toast } from 'react-toastify';

/**
 * Global axios interceptors — installed once from _app.jsx via
 * installApiInterceptors(). Idempotent so HMR doesn't double-install.
 *
 * What it does:
 *   1. Default 30s timeout on every request (was unlimited — a stalled
 *      backend used to leave the UI spinning forever).
 *   2. Mirror the CSRF cookie into X-CSRF-Token on every state-changing
 *      request. Frontend doesn't need to know about the token; reading
 *      cookies and adding the header happens automatically.
 *   3. On failure, surface a user-facing toast. Categorises errors so
 *      we get specific copy for timeout / network / 401 / 500 instead
 *      of every error reading "Something went wrong".
 *
 * Per-call override: pass `{ suppressErrorToast: true }` in the request
 * config to skip the toast — useful for endpoints where the calling
 * code shows its own error UI (CartDrawer pincode check, validation
 * pre-flights, etc.).
 */

let installed = false;
const DEFAULT_TIMEOUT_MS = 30_000;

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
  return m ? decodeURIComponent(m.split('=')[1]) : null;
}

function isStateChanging(method) {
  return ['post', 'put', 'patch', 'delete'].includes((method || '').toLowerCase());
}

function buildErrorMessage(error) {
  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
    return 'The server took too long to respond. Please check your connection and try again.';
  }
  if (error.message === 'Network Error' || !error.response) {
    return "Can't reach the server. Check your internet connection.";
  }
  const status = error.response.status;
  const apiMessage =
    error.response.data?.message
    || error.response.data?.error
    || (typeof error.response.data === 'string' ? error.response.data : null);

  if (status === 401) return apiMessage || 'Please sign in to continue.';
  if (status === 403) return apiMessage || "You don't have permission for that action.";
  if (status === 404) return apiMessage || "We couldn't find that resource.";
  if (status === 409) return apiMessage || 'Conflict — please refresh and try again.';
  if (status === 422 || status === 400) return apiMessage || 'Some details look invalid. Please review and retry.';
  if (status === 429) return apiMessage || "Too many requests — please slow down.";
  if (status >= 500) return apiMessage || 'Our server hit a bump. Please try again in a moment.';
  return apiMessage || 'Something went wrong. Please try again.';
}

export function installApiInterceptors() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // Apply to BOTH the global axios singleton and any future axios.create()
  // instances by patching defaults + adding interceptors at the singleton level.
  axios.defaults.timeout = axios.defaults.timeout || DEFAULT_TIMEOUT_MS;

  axios.interceptors.request.use((config) => {
    if (!config.timeout) config.timeout = DEFAULT_TIMEOUT_MS;

    if (isStateChanging(config.method)) {
      const csrf = readCookie('cc_csrf');
      if (csrf && !config.headers?.['X-CSRF-Token']) {
        config.headers = config.headers || {};
        config.headers['X-CSRF-Token'] = csrf;
      }
    }
    return config;
  });

  axios.interceptors.response.use(
    (res) => res,
    (error) => {
      try {
        const cfg = error.config || {};
        if (cfg.suppressErrorToast) return Promise.reject(error);

        // Don't toast on background polls (long-polling, react-query refetches
        // with retries that will get a chance to recover silently).
        if (cfg.silentError) return Promise.reject(error);

        const msg = buildErrorMessage(error);
        // Dedupe: a single slow/unreachable backend makes a page fire several
        // requests at once (and react-query retries each), which used to stack
        // one identical toast per failure. Keying the toastId to the message
        // means react-toastify collapses them into a single visible toast —
        // the same pattern src/utils/toast.js already uses.
        toast.error(msg, { toastId: `api-error:${msg}`, autoClose: 4000, hideProgressBar: false });
      } catch { /* never let the interceptor itself throw */ }
      return Promise.reject(error);
    },
  );

  // One-shot fetch of the CSRF token so the cookie is set on first load —
  // ignored if the endpoint isn't reachable.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
  axios.get(`${apiUrl}/api/csrf/token`, { suppressErrorToast: true, silentError: true })
    .catch(() => { /* fine — CSRF is opt-in on the backend today */ });
}
