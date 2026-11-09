import { BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { store } from './storage';

const TOKEN_KEY = 'tp_token';
let token = null;
let onUnauthorized = () => {};

export const session = {
  load: async () => { token = await store.get(TOKEN_KEY); return token; },
  set: async (t) => { token = t; await store.set(TOKEN_KEY, t); },
  clear: async () => { token = null; await store.del(TOKEN_KEY); },
  get token() { return token; }
};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Always resolves to { success, ... }. Never throws and never hangs forever.
//   network failure -> { success:false, code:'NETWORK', network:true }
//   timeout         -> { success:false, code:'TIMEOUT', network:true }
export async function api(path, { method = 'GET', body, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(BASE_URL + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === 'AbortError') return { success: false, code: 'TIMEOUT', network: true, error: 'Timeout' };
    return { success: false, code: 'NETWORK', network: true, error: 'Cannot reach the server' };
  }
  clearTimeout(timer);
  let data;
  try { data = await res.json(); } catch { data = { success: false, code: 'SERVER', error: 'Bad server response (HTTP ' + res.status + ')' }; }
  if (res.status === 401 && token) onUnauthorized();
  return data;
}

export const checkServer = () => api('/api/health', { timeoutMs: 70000 });
