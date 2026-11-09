// Shared helpers for the passenger and driver apps.
const App = (() => {
  const TOKEN_KEY = 'tp_token';
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } }
  };
  const session = {
    get token() { return store.get(TOKEN_KEY); },
    set: (t) => store.set(TOKEN_KEY, t),
    clear: () => store.del(TOKEN_KEY)
  };

  let onUnauthorized = () => {};

  // Always resolves to { success, ... }. Network failures resolve to { success:false, code:'NETWORK' }.
  async function api(path, { method = 'GET', body } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = session.token;
    if (token) headers.Authorization = 'Bearer ' + token;

    let res;
    try {
      res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
      return { success: false, code: 'NETWORK', network: true, error: 'Cannot reach the server' };
    }
    let data;
    try { data = await res.json(); } catch { data = { success: false, code: 'SERVER', error: 'Bad server response' }; }
    if (res.status === 401 && token) onUnauthorized();
    return data;
  }

  const errMsg = (d) => (d && d.code && I18N.has('err_' + d.code) ? I18N.t('err_' + d.code) : (d && d.error) || I18N.t('err_SERVER'));
  const fmt = (n) => Number(n).toFixed(2);
  const fmtTime = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const $ = (id) => document.getElementById(id);

  function toast(message, type = 'info') {
    const colors = { success: 'text-bg-success', danger: 'text-bg-danger', warning: 'text-bg-warning', info: 'text-bg-primary' };
    const el = document.createElement('div');
    el.className = `toast align-items-center ${colors[type] || colors.info} border-0 mb-2`;
    el.setAttribute('role', 'alert');
    const wrap = document.createElement('div');
    wrap.className = 'd-flex';
    const body = document.createElement('div');
    body.className = 'toast-body fw-semibold';
    body.textContent = message; // textContent: never interpret server/user text as HTML
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-close btn-close-white me-2 m-auto';
    close.setAttribute('data-bs-dismiss', 'toast');
    wrap.append(body, close);
    el.append(wrap);
    $('toastContainer').appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3500 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    t.show();
  }

  // ----- theme -----
  function initTheme() {
    const apply = (th) => {
      document.documentElement.setAttribute('data-bs-theme', th);
      const icon = $('themeIcon');
      if (icon) icon.className = th === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    };
    apply(store.get('tp_theme') || 'light');
    const btn = $('themeBtn');
    if (btn) btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      store.set('tp_theme', next);
      apply(next);
    });
  }

  // ----- live balance updates -----
  let socket = null;
  function connectSocket(onBalance) {
    disconnectSocket();
    if (typeof io === 'undefined' || !session.token) return;
    socket = io({ auth: { token: session.token } });
    socket.on('balance', onBalance);
  }
  function disconnectSocket() { if (socket) { socket.disconnect(); socket = null; } }

  // ----- Web NFC (Chrome on Android, HTTPS or localhost only) -----
  const nfc = {
    supported: () => 'NDEFReader' in window,
    // Resolves to an AbortController; call .abort() to stop listening.
    async start(onSerial, onError) {
      const ctrl = new AbortController();
      const reader = new NDEFReader();
      await reader.scan({ signal: ctrl.signal });
      reader.onreading = (e) => onSerial(e.serialNumber);
      reader.onreadingerror = () => onError && onError();
      return ctrl;
    }
  };

  // ----- beep (no audio files needed) -----
  let audio = null;
  function beep(ok) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      osc.type = ok ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(ok ? 880 : 220, now);
      if (ok) osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
      gain.gain.setValueAtTime(ok ? 0.3 : 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + (ok ? 0.15 : 0.25));
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(now + (ok ? 0.15 : 0.25));
    } catch { /* audio not available */ }
  }

  function registerSW() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Click delegation: <button data-action="name"> calls actions.name(el, event)
  function bindActions(actions) {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && actions[el.dataset.action]) actions[el.dataset.action](el, e);
    });
  }

  async function withBusy(btn, fn) {
    if (btn.disabled) return;
    btn.disabled = true;
    try { return await fn(); } finally { btn.disabled = false; }
  }

  return {
    api, errMsg, fmt, fmtTime, $, toast, session, store, nfc, beep, initTheme, connectSocket, disconnectSocket,
    registerSW, bindActions, withBusy, set onUnauthorized(fn) { onUnauthorized = fn; }
  };
})();
