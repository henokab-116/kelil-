import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Vibration, Pressable } from 'react-native';
import { Btn, Card, Banner, Field, Chips, H, Muted, TabBar } from '../components/UI';
import QrScannerModal from './QrScannerModal';
import GameScreen from './GameScreen';
import Profile from './Profile';
import { useI18n } from '../i18n';
import { api } from '../api';
import { store } from '../storage';
import { nfcStatus, readTagSerial, cancelNfc } from '../nfc';
import { colors, money } from '../theme';
import { errMsg } from './AuthScreen';

const VEHICLES = {
  bajaj: { cap: 3, fare: 5, label: 'vehBajaj' },
  e_bajaj: { cap: 6, fare: 7, label: 'vehEBajaj' },
  taxi: { cap: 14, fare: 10, label: 'vehTaxi' }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const newRef = () => `${Date.now()}-${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2, 6)}`;
const fmtTime = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return ''; } };

export default function DriverApp({ user, setUser, config, onLogout, onRefresh, bottomInset }) {
  const { t, has } = useI18n();
  const [tab, setTab] = useState('terminal');
  const [st, setSt] = useState({ vehicle: VEHICLES[user.vehicleType] ? user.vehicleType : 'bajaj', route: '', fare: '5', count: 0 });
  const [result, setResult] = useState({ text: '', type: 'success' });
  const [listening, setListening] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [manual, setManual] = useState('');
  const [shift, setShift] = useState({ total: 0, count: 0, recent: [] });
  const [wd, setWd] = useState('');
  const [wdMsg, setWdMsg] = useState({ text: '', type: 'info' });

  const busy = useRef(false);
  const lastRead = useRef({ id: '', at: 0 });
  const listen = useRef(false);
  const stRef = useRef(st);
  const userRef = useRef(user);
  stRef.current = st;
  userRef.current = user;
  const pending = user.status !== 'active';
  const veh = VEHICLES[st.vehicle];

  // restore per-device shift settings
  useEffect(() => {
    store.getJson('tp_drv_state', null).then((saved) => {
      if (saved && VEHICLES[saved.vehicle]) setSt((p) => ({ ...p, ...saved, fare: String(saved.fare ?? p.fare) }));
      else setSt((p) => ({ ...p, fare: String(VEHICLES[p.vehicle].fare) }));
    });
  }, []);
  useEffect(() => { store.setJson('tp_drv_state', st); }, [st]);

  const flash = (text, type) => { setResult({ text, type }); setTimeout(() => setResult((r) => (r.text === text ? { text: '', type: r.type } : r)), 4500); };

  const loadShift = useCallback(async () => {
    const d = await api('/api/driver/shift');
    if (!d.success) return;
    setShift({ total: d.total, count: d.count, recent: d.recent || [] });
    setUser({ ...userRef.current, balance: d.balance });
  }, [setUser]);
  useEffect(() => { if (tab === 'shift') loadShift(); }, [tab, loadShift]);

  // identifier = NFC tag serial or scanned QR text
  const charge = async (identifier) => {
    const cur = stRef.current;
    if (!identifier || busy.current || userRef.current.status !== 'active') return;
    const now = Date.now();
    if (identifier === lastRead.current.id && now - lastRead.current.at < 5000) return; // a held tag fires repeatedly
    lastRead.current = { id: identifier, at: now };

    if (cur.count >= VEHICLES[cur.vehicle].cap) { Vibration.vibrate([0, 200, 100, 200]); return flash(t('vehicleFull'), 'danger'); }
    const fare = Number(cur.fare);
    if (!Number.isFinite(fare) || fare <= 0) { Vibration.vibrate([0, 200, 100, 200]); return flash(t('err_INVALID_AMOUNT'), 'danger'); }

    busy.current = true;
    try {
      const ref = newRef(); // same ref on retries => the server never charges twice
      let d;
      for (let attempt = 0; attempt < 3; attempt++) {
        d = await api('/api/driver/charge', { method: 'POST', body: { identifier, amount: fare, route: cur.route.trim() || 'Bus fare', ref }, timeoutMs: 20000 });
        if (!d.network) break;
        await sleep(1000);
      }
      if (d.success) {
        Vibration.vibrate(120);
        setSt((p) => ({ ...p, count: d.duplicate ? p.count : p.count + 1 }));
        setUser({ ...userRef.current, balance: d.balance });
        flash(`${t('paidOk')} · ${d.payerName} · +${money(d.amount)} ETB`, 'success');
      } else {
        Vibration.vibrate([0, 200, 100, 200]);
        lastRead.current = { id: '', at: 0 }; // allow an immediate retry after a failure
        flash(errMsg(t, has, d), 'danger');
      }
    } finally {
      busy.current = false;
    }
  };
  const chargeRef = useRef(charge);
  chargeRef.current = charge;

  // ----- NFC: keep reading cards until the driver stops -----
  const stopNfc = useCallback(() => { listen.current = false; setListening(false); cancelNfc(); }, []);
  useEffect(() => () => { listen.current = false; cancelNfc(); }, []);
  useEffect(() => { if (tab !== 'terminal') stopNfc(); }, [tab, stopNfc]);

  async function startNfc() {
    const status = await nfcStatus();
    if (status === 'no-hardware') return flash(t('nfcNoHardware'), 'danger');
    if (status === 'off') return flash(t('nfcTurnOn'), 'danger');
    listen.current = true;
    setListening(true);
    while (listen.current) {
      try {
        const serial = await readTagSerial();
        if (!listen.current) break;
        if (serial) await chargeRef.current(serial); else flash(t('err_NFC_READ'), 'danger');
      } catch {
        if (!listen.current) break;
        flash(t('err_NFC_READ'), 'danger');
        await sleep(800);
      }
      await sleep(700);
    }
  }

  const setVehicle = (v) => setSt((p) => ({ ...p, vehicle: v, fare: String(VEHICLES[v].fare), count: Math.min(p.count, VEHICLES[v].cap) }));
  const adjust = (delta) => setSt((p) => {
    const next = p.count + delta;
    if (next < 0) return p;
    if (next > VEHICLES[p.vehicle].cap) { Vibration.vibrate(200); return p; }
    return { ...p, count: next };
  });

  async function withdraw() {
    const d = await api('/api/driver/withdraw', { method: 'POST', body: { amount: wd } });
    if (d.success) { setUser({ ...user, balance: d.newBalance }); setWd(''); setWdMsg({ text: t('withdrawDone'), type: 'success' }); }
    else setWdMsg({ text: errMsg(t, has, d), type: 'danger' });
  }

  const pct = Math.min(100, Math.round((st.count / veh.cap) * 100));
  const barColor = pct >= 100 ? colors.danger : pct >= 70 ? colors.warning : colors.success;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'terminal' && (
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <H style={{ marginBottom: 0 }}>{user.name}</H>
                <Muted>{t('walletLabel')}: {money(user.balance)} ETB</Muted>
              </View>
              <Text style={{ color: colors.success, fontWeight: '800' }}>● {t('statusOnDuty')}</Text>
            </View>

            {pending && (
              <Card>
                <Banner text={t('pendingApproval')} type="warning" style={{ marginBottom: 8 }} />
                <Btn title={t('btnRefresh')} kind="ghost" onPress={onRefresh} />
              </Card>
            )}

            <Card>
              <H style={{ fontSize: 15 }}>{t('secSelectVehicle')}</H>
              <Chips options={Object.keys(VEHICLES).map((k) => ({ value: k, label: t(VEHICLES[k].label) }))} value={st.vehicle} onChange={setVehicle} />
              <View style={{ height: 14 }} />
              <Field label={t('labelRoute')} value={st.route} onChangeText={(v) => setSt((p) => ({ ...p, route: v }))} autoCapitalize="words" />
              <Field label={t('labelFare')} value={st.fare} onChangeText={(v) => setSt((p) => ({ ...p, fare: v }))} keyboardType="decimal-pad" style={{ marginBottom: 0 }} />
            </Card>

            <Card>
              <Text style={{ fontWeight: '700', color: colors.muted, marginBottom: 6 }}>{t('labelPsgLoad')}  ({st.count}/{veh.cap})</Text>
              <View style={{ height: 10, backgroundColor: '#e9ecef', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                <View style={{ width: pct + '%', height: 10, backgroundColor: barColor }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn title={t('btnOffboard')} kind="ghost" onPress={() => adjust(-1)} style={{ flex: 1 }} />
                <Btn title={t('btnOnboard')} kind="ghost" onPress={() => adjust(1)} style={{ flex: 1 }} />
              </View>
            </Card>

            <Card>
              <H style={{ fontSize: 15 }}>{t('readyToReceive')}</H>
              <Banner text={result.text} type={result.type} />
              <Muted style={{ marginBottom: 10 }}>{listening ? t('nfcListening') : t('scanPrompt')}</Muted>
              {listening
                ? <Btn title={t('btnStopNfc')} kind="danger" onPress={stopNfc} />
                : <Btn title={'📶  ' + t('btnTapNFC')} onPress={startNfc} disabled={pending} />}
              <Btn title={'▦  ' + t('btnScanQR')} kind="success" onPress={() => setScanOpen(true)} disabled={pending} style={{ marginTop: 10 }} />
              {config.demo && (
                <View style={{ marginTop: 14 }}>
                  <Field label={t('manualTitle')} value={manual} onChangeText={setManual} placeholder={t('manualPrompt')} />
                  <Btn title={t('btnManual')} kind="ghost" onPress={() => { if (manual.trim()) { chargeRef.current(manual.trim()); setManual(''); } }} disabled={pending} />
                </View>
              )}
            </Card>
          </ScrollView>
        )}

        {tab === 'shift' && (
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
              <Text style={{ color: '#cfe2ff', fontWeight: '700' }}>{t('lblShiftEarnings')}</Text>
              <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900' }}>{money(shift.total)} <Text style={{ fontSize: 16 }}>ETB</Text></Text>
              <Text style={{ color: '#cfe2ff' }}>{t('lblTotalPassengers')}: {shift.count}  ·  {t('walletLabel')}: {money(user.balance)} ETB</Text>
            </Card>
            <Card>
              <H style={{ fontSize: 15 }}>{t('btnWithdraw')}</H>
              <Banner text={wdMsg.text} type={wdMsg.type} />
              <Field label={t('withdrawAmount')} value={wd} onChangeText={setWd} keyboardType="decimal-pad" placeholder={config.minWithdraw ? `min ${config.minWithdraw}` : ''} />
              <Btn title={t('btnConfirm')} onPress={withdraw} disabled={pending || !wd} />
            </Card>
            <H style={{ fontSize: 15 }}>{t('lblRecentBoardings')}</H>
            {!shift.recent.length && <Muted>{t('msgNoHistory')}</Muted>}
            {shift.recent.map((tx, i) => (
              <Card key={tx.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: '700' }}>{tx.title}</Text>
                  <Muted>{fmtTime(tx.createdAt)}</Muted>
                </View>
                <Text style={{ fontWeight: '800', color: colors.success }}>+{money(tx.amount)} ETB</Text>
              </Card>
            ))}
          </ScrollView>
        )}

        {tab === 'play' && <GameScreen />}
        {tab === 'profile' && <Profile user={user} onUser={setUser} onLogout={onLogout} />}
      </View>

      <TabBar
        bottomInset={bottomInset}
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'terminal', label: t('terminalTitle'), icon: '📟' },
          { key: 'shift', label: t('shiftTitle'), icon: '💰' },
          { key: 'play', label: t('navPlay'), icon: '🎮' },
          { key: 'profile', label: t('navProfile'), icon: '👤' }
        ]}
      />
      <QrScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(text) => { setScanOpen(false); chargeRef.current(text); }}
      />
    </View>
  );
}
