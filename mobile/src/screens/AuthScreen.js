import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Btn, Field, Banner, Chips, H, Muted } from '../components/UI';
import LanguagePicker from '../components/LanguagePicker';
import { useI18n } from '../i18n';
import { api, checkServer, session } from '../api';
import { BASE_URL } from '../config';
import { colors } from '../theme';

const VEHICLES = [{ value: 'bajaj', k: 'vehBajaj' }, { value: 'e_bajaj', k: 'vehEBajaj' }, { value: 'taxi', k: 'vehTaxi' }];

export const errMsg = (t, has, d) => (d && d.code && has('err_' + d.code) ? t('err_' + d.code) : (d && d.error) || t('err_SERVER'));

export default function AuthScreen({ onAuth }) {
  const { t, has } = useI18n();
  const [tab, setTab] = useState('login');
  const [role, setRole] = useState('passenger');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'danger' });
  const [f, setF] = useState({ login: '', password: '', name: '', phone: '', email: '', license: '', plate: '', vehicle: 'bajaj' });
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setMsg({ text: '', type: 'danger' });
    setBusy(true);
    // Render's free tier can take a while to wake up: tell the person instead of leaving a silent spinner.
    const slow = setTimeout(() => setMsg({ text: t('serverWaking'), type: 'warning' }), 6000);
    const d = tab === 'login'
      ? await api('/api/auth/login', { method: 'POST', body: { login: f.login, password: f.password } })
      : await api('/api/auth/register', {
          method: 'POST',
          body: { role, name: f.name, phone: f.phone, email: f.email, password: f.password, ...(role === 'driver' ? { licenseNo: f.license, plate: f.plate, vehicleType: f.vehicle } : {}) }
        });
    clearTimeout(slow);
    setBusy(false);
    if (!d.success) return setMsg({ text: errMsg(t, has, d), type: 'danger' });
    await session.set(d.token);
    onAuth(d.user);
  }

  async function test() {
    setMsg({ text: t('serverWaking'), type: 'warning' });
    setBusy(true);
    const d = await checkServer();
    setBusy(false);
    setMsg(d && d.status === 'ok' ? { text: t('serverOk'), type: 'success' } : { text: errMsg(t, has, d), type: 'danger' });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.primary }}>🚌 Transit Tap & Pay</Text>
        <Muted style={{ marginBottom: 14 }}>{t('subtitle')}</Muted>
        <LanguagePicker />
        <View style={{ height: 16 }} />
        <Chips options={[{ value: 'login', label: t('tabLogin') }, { value: 'register', label: t('tabRegister') }]} value={tab} onChange={(v) => { setTab(v); setMsg({ text: '' }); }} />
        <View style={{ height: 16 }} />
        <Banner text={msg.text} type={msg.type} />

        {tab === 'register' && (
          <>
            <H style={{ fontSize: 14 }}>{t('iAm')}</H>
            <Chips options={[{ value: 'passenger', label: t('rolePassenger') }, { value: 'driver', label: t('roleDriver') }]} value={role} onChange={setRole} />
            <View style={{ height: 14 }} />
            <Field label={t('labelFullName')} value={f.name} onChangeText={set('name')} autoCapitalize="words" />
            <Field label={t('labelPhone')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="09…" />
            <Field label={t('labelEmailOptional')} value={f.email} onChangeText={set('email')} keyboardType="email-address" />
            {role === 'driver' && (
              <>
                <Field label={t('labelLicense')} value={f.license} onChangeText={set('license')} autoCapitalize="characters" />
                <Field label={t('labelPlate')} value={f.plate} onChangeText={set('plate')} autoCapitalize="characters" />
                <Chips options={VEHICLES.map((v) => ({ value: v.value, label: t(v.k) }))} value={f.vehicle} onChange={set('vehicle')} />
                <View style={{ height: 12 }} />
              </>
            )}
          </>
        )}
        {tab === 'login' && <Field label={t('labelPhoneOrEmail')} value={f.login} onChangeText={set('login')} keyboardType="email-address" />}
        <Field label={t('labelPassword')} value={f.password} onChangeText={set('password')} secureTextEntry autoCapitalize="none" />

        <Btn title={tab === 'login' ? t('btnSignIn') : t('btnSignUp')} onPress={submit} loading={busy} />
        <View style={{ height: 18 }} />
        <Btn title={t('testConnection')} kind="ghost" onPress={test} disabled={busy} />
        <Muted style={{ marginTop: 8, textAlign: 'center' }}>{BASE_URL.replace(/^https?:\/\//, '')}</Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
