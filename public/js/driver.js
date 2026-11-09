(() => {
  'use strict';
  const { api, $, toast, errMsg, fmt, fmtTime, session, store, nfc } = App;
  const t = I18N.t;

  const VEHICLES = {
    bajaj:   { cap: 3,  fare: 5,  label: 'vehBajaj' },
    e_bajaj: { cap: 6,  fare: 7,  label: 'vehEBajaj' },
    taxi:    { cap: 14, fare: 10, label: 'vehTaxi' }
  };

  let user = null;
  let config = {};
  let nfcCtrl = null;
  let scanner = null;
  let busy = false;
  let lastRead = { id: '', at: 0 };
  let bannerTimer = null;

  // Per-device shift settings (not money, so localStorage is fine).
  const state = Object.assign({ vehicle: 'bajaj', route: '', fare: 5, count: 0 }, JSON.parse(store.get('tp_drv_state') || '{}'));
  const saveState = () => store.set('tp_drv_state', JSON.stringify(state));

  // ---------- auth screens ----------
  const showAuthError = (msg) => { const a = $('authAlert'); a.textContent = msg; a.classList.remove('d-none'); };

  function switchAuthTab(tab) {
    const login = tab === 'login';
    $('tabLogin').classList.toggle('active', login);
    $('tabRegister').classList.toggle('active', !login);
    $('loginForm').classList.toggle('d-none', !login);
    $('registerForm').classList.toggle('d-none', login);
    $('authAlert').classList.add('d-none');
  }

  async function finishAuth(d) {
    if (!d.success) return showAuthError(errMsg(d));
    if (d.user.role !== 'driver') return showAuthError(t('err_WRONG_APP'));
    session.set(d.token);
    user = d.user;
    if (VEHICLES[user.vehicleType] && !store.get('tp_drv_state')) { state.vehicle = user.vehicleType; state.fare = VEHICLES[state.vehicle].fare; }
    enterDashboard();
  }

  function logout() {
    session.clear();
    App.disconnectSocket();
    stopNfc();
    stopScanner();
    user = null;
    $('dashboardScreen').classList.add('d-none');
    $('logoutBtn').classList.add('d-none');
    $('authScreen').classList.remove('d-none');
    $('loginForm').reset();
    $('registerForm').reset();
    switchAuthTab('login');
  }
  App.onUnauthorized = logout;

  // ---------- dashboard ----------
  function enterDashboard() {
    $('authScreen').classList.add('d-none');
    $('dashboardScreen').classList.remove('d-none');
    $('logoutBtn').classList.remove('d-none');
    renderDriver();
    selectVehicle(state.vehicle, false);
    $('routeInput').value = state.route;
    $('fareInput').value = fmt(state.fare);
    $('manualBtn').classList.toggle('d-none', !config.demo);
    App.connectSocket(onBalance);
    loadShift();
  }

  function renderDriver() {
    $('driverName').textContent = user.name;
    $('driverAvatar').textContent = user.name.charAt(0).toUpperCase();
    $('driverMeta').textContent = [user.licenseNo, user.plate].filter(Boolean).join(' · ');
    $('walletBalance').textContent = fmt(user.balance);
    const pending = user.status !== 'active';
    $('pendingAlert').classList.toggle('d-none', !pending);
    document.querySelectorAll('.term-btn').forEach((b) => { b.disabled = pending; });
    $('terminal').classList.toggle('listening', !!nfcCtrl && !pending);
  }

  function onBalance(d) {
    if (!user) return;
    user.balance = d.balance;
    $('walletBalance').textContent = fmt(d.balance);
  }

  function selectVehicle(type, resetFare = true) {
    const v = VEHICLES[type];
    if (!v) return;
    state.vehicle = type;
    if (resetFare) { state.fare = v.fare; $('fareInput').value = fmt(v.fare); }
    state.count = Math.min(state.count, v.cap);
    document.querySelectorAll('.vehicle-card').forEach((c) => c.classList.toggle('active', c.dataset.vehicle === type));
    $('psgMax').textContent = v.cap;
    $('capacityLabel').textContent = `Max: ${v.cap}`;
    $('vehBadge').textContent = t(v.label);
    renderCapacity();
    saveState();
  }

  function renderCapacity() {
    const cap = VEHICLES[state.vehicle].cap;
    const pct = Math.round((state.count / cap) * 100);
    $('psgCount').textContent = state.count;
    const bar = $('capacityBar');
    bar.style.width = pct + '%';
    bar.className = 'progress-bar ' + (pct >= 100 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success');
  }

  function adjustPsg(delta) {
    const next = state.count + delta;
    if (next < 0) return;
    if (next > VEHICLES[state.vehicle].cap) { App.beep(false); return toast(t('vehicleFull'), 'danger'); }
    state.count = next;
    renderCapacity();
    saveState();
  }

  async function loadShift() {
    const d = await api('/api/driver/shift');
    if (!d.success) return;
    user.balance = d.balance;
    $('walletBalance').textContent = fmt(d.balance);
    $('totalEarnings').textContent = fmt(d.total);
    $('totalCount').textContent = d.count;
    const list = $('recentList');
    list.replaceChildren();
    if (!d.recent.length) {
      const e = document.createElement('div');
      e.className = 'text-center text-muted py-3 small';
      e.textContent = t('msgNoHistory');
      list.append(e);
      return;
    }
    for (const tx of d.recent) {
      const row = document.createElement('div');
      row.className = 'list-group-item d-flex justify-content-between align-items-center py-2 px-0';
      const left = document.createElement('div');
      const title = document.createElement('h6');
      title.className = 'mb-0 fw-semibold small';
      title.textContent = tx.title;
      const when = document.createElement('small');
      when.className = 'text-secondary';
      when.textContent = fmtTime(tx.createdAt);
      left.append(title, when);
      const amt = document.createElement('span');
      amt.className = 'fw-bold text-success small';
      amt.textContent = `+${fmt(tx.amount)} ETB`;
      row.append(left, amt);
      list.append(row);
    }
  }

  // ---------- taking payment ----------
  function showResult(ok, text) {
    const b = $('resultBanner');
    b.className = `alert py-2 fw-bold ${ok ? 'alert-success' : 'alert-danger'}`;
    b.textContent = text;
    b.style.display = 'block';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.style.display = 'none'; }, 4000);
  }

  const newRef = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // identifier = NFC tag serial number or scanned QR text
  async function charge(identifier) {
    if (!identifier || busy || user.status !== 'active') return;
    const now = Date.now();
    if (identifier === lastRead.id && now - lastRead.at < 5000) return; // tag held against the phone fires repeatedly
    lastRead = { id: identifier, at: now };

    if (state.count >= VEHICLES[state.vehicle].cap) { App.beep(false); return showResult(false, t('vehicleFull')); }
    const fare = Number($('fareInput').value);
    if (!Number.isFinite(fare) || fare <= 0) { App.beep(false); return showResult(false, t('err_INVALID_AMOUNT')); }
    state.route = $('routeInput').value.trim();
    state.fare = fare;

    busy = true;
    try {
      const ref = newRef(); // same ref on retries => the server never charges twice
      let d;
      for (let attempt = 0; attempt < 3; attempt++) {
        d = await api('/api/driver/charge', { method: 'POST', body: { identifier, amount: fare, route: state.route || 'Bus fare', ref } });
        if (!d.network) break;
        await sleep(1000);
      }
      if (d.success) {
        App.beep(true);
        if (!d.duplicate) state.count++;
        user.balance = d.balance;
        $('walletBalance').textContent = fmt(d.balance);
        renderCapacity();
        showResult(true, `${t('paidOk')} · ${d.payerName} · +${fmt(d.amount)} ETB`);
        loadShift();
      } else {
        App.beep(false);
        lastRead = { id: '', at: 0 }; // allow an immediate retry after a failure (e.g. after top-up)
        showResult(false, errMsg(d));
      }
      saveState();
    } finally {
      busy = false;
    }
  }

  // ----- NFC -----
  function stopNfc() {
    if (nfcCtrl) { nfcCtrl.abort(); nfcCtrl = null; }
    $('nfcBtnText').textContent = t('btnTapNFC');
    $('terminalHint').textContent = t('scanPrompt');
    $('terminal').classList.remove('listening');
  }

  async function toggleNfc() {
    if (nfcCtrl) return stopNfc();
    if (!nfc.supported()) return toast(t('nfcUnsupported'), 'warning');
    try {
      nfcCtrl = await nfc.start(charge, () => showResult(false, t('err_NFC_READ')));
      $('nfcBtnText').textContent = t('btnStopNfc');
      $('terminalHint').textContent = t('nfcListening');
      $('terminal').classList.add('listening');
    } catch (e) {
      nfcCtrl = null;
      toast(`${t('nfcUnsupported')} (${e.message})`, 'danger');
    }
  }

  // ----- QR camera -----
  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') return toast('QR scanner failed to load', 'danger');
    scanner = new Html5Qrcode('qrReader');
    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, async (text) => {
        await stopScanner();
        bootstrap.Modal.getInstance($('scanModal'))?.hide();
        charge(text.trim());
      }, () => { /* no code in this frame – expected */ });
    } catch (e) {
      scanner = null;
      toast(`Camera: ${e}`, 'danger');
    }
  }

  async function stopScanner() {
    const s = scanner;
    scanner = null;
    if (!s) return;
    try { await s.stop(); s.clear(); } catch { /* already stopped */ }
  }

  // ---------- actions ----------
  App.bindActions({
    authTab: (el) => switchAuthTab(el.dataset.tab),
    logout,
    vehicle: (el) => selectVehicle(el.dataset.vehicle),
    psg: (el) => adjustPsg(Number(el.dataset.delta)),
    psgReset: () => { state.count = 0; renderCapacity(); saveState(); },
    toggleNfc,
    manual: () => { const c = prompt(t('manualPrompt')); if (c) charge(c.trim()); },
    refreshStatus: async () => {
      const d = await api('/api/auth/me');
      if (d.success) { user = d.user; renderDriver(); }
    },
    withdraw: (el) => App.withBusy(el, async () => {
      const d = await api('/api/driver/withdraw', { method: 'POST', body: { amount: $('withdrawAmount').value } });
      if (!d.success) return toast(errMsg(d), 'danger');
      user.balance = d.newBalance;
      $('walletBalance').textContent = fmt(d.newBalance);
      toast(t('withdrawDone'), 'success');
      bootstrap.Modal.getInstance($('withdrawModal')).hide();
    })
  });

  // ---------- boot ----------
  document.addEventListener('DOMContentLoaded', async () => {
    I18N.init();
    App.initTheme();
    App.registerSW();

    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await App.withBusy(e.submitter, async () => finishAuth(await api('/api/auth/login', {
        method: 'POST', body: { login: $('loginId').value, password: $('loginPassword').value }
      })));
    });
    $('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await App.withBusy(e.submitter, async () => finishAuth(await api('/api/auth/register', {
        method: 'POST',
        body: {
          role: 'driver', name: $('regName').value, phone: $('regPhone').value, licenseNo: $('regLicense').value,
          plate: $('regPlate').value, vehicleType: $('regVehicle').value, password: $('regPassword').value
        }
      })));
    });

    $('routeInput').addEventListener('change', () => { state.route = $('routeInput').value.trim(); saveState(); });
    $('fareInput').addEventListener('change', () => { const f = Number($('fareInput').value); if (f > 0) { state.fare = f; saveState(); } });

    const scanModal = $('scanModal');
    scanModal.addEventListener('shown.bs.modal', startScanner);
    scanModal.addEventListener('hidden.bs.modal', stopScanner);
    document.addEventListener('langchange', () => {
      if (!user) return;
      $('vehBadge').textContent = t(VEHICLES[state.vehicle].label);
      if (nfcCtrl) { $('nfcBtnText').textContent = t('btnStopNfc'); $('terminalHint').textContent = t('nfcListening'); }
      loadShift();
    });

    const c = await api('/api/config');
    config = c.success ? c.config : {};

    if (session.token) {
      const d = await api('/api/auth/me');
      if (d.success && d.user.role === 'driver') { user = d.user; enterDashboard(); }
      else { if (d.success) showAuthError(t('err_WRONG_APP')); session.clear(); }
    }
  });
})();
