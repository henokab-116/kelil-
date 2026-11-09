import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Btn, Card, Banner, H, Muted } from '../components/UI';
import LanguagePicker from '../components/LanguagePicker';
import { useI18n } from '../i18n';
import { api } from '../api';
import { nfcStatus, readTagSerial, cancelNfc } from '../nfc';
import { errMsg } from './AuthScreen';

export default function Profile({ user, onUser, onLogout }) {
  const { t, has } = useI18n();
  const [msg, setMsg] = useState({ text: '', type: 'info' });
  const [linking, setLinking] = useState(false);
  const passenger = user.role === 'passenger';

  async function linkCard() {
    const st = await nfcStatus();
    if (st === 'no-hardware') return setMsg({ text: t('nfcNoHardware'), type: 'warning' });
    if (st === 'off') return setMsg({ text: t('nfcTurnOn'), type: 'warning' });
    setMsg({ text: t('tapCardNow'), type: 'info' });
    setLinking(true);
    try {
      const serial = await readTagSerial();
      if (!serial) { setMsg({ text: t('err_NFC_READ'), type: 'danger' }); return; }
      const d = await api('/api/passenger/card', { method: 'PUT', body: { serial } });
      if (d.success) { onUser({ ...user, hasCard: true }); setMsg({ text: t('cardLinked'), type: 'success' }); }
      else setMsg({ text: errMsg(t, has, d), type: 'danger' });
    } catch {
      setMsg({ text: t('err_NFC_READ'), type: 'danger' });
    } finally {
      setLinking(false);
    }
  }

  async function unlink() {
    const d = await api('/api/passenger/card', { method: 'DELETE' });
    if (d.success) { onUser({ ...user, hasCard: false }); setMsg({ text: '', type: 'info' }); }
    else setMsg({ text: errMsg(t, has, d), type: 'danger' });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>{user.name}</Text>
        <Muted>{user.phone}{user.email ? ' · ' + user.email : ''}</Muted>
        {!passenger && <Muted style={{ marginTop: 4 }}>{[user.licenseNo, user.plate].filter(Boolean).join(' · ')}</Muted>}
      </Card>

      {passenger && (
        <Card>
          <H style={{ fontSize: 16 }}>{t('myCard')}</H>
          <Banner text={msg.text} type={msg.type} />
          <Muted style={{ marginBottom: 10 }}>{user.hasCard ? t('cardLinked') : t('cardNotLinked')}</Muted>
          {linking
            ? <Btn title={t('cancel')} kind="ghost" onPress={() => cancelNfc()} />
            : <Btn title={t('linkCard')} onPress={linkCard} />}
          {user.hasCard && !linking && <Btn title={t('unlinkCard')} kind="ghost" onPress={unlink} style={{ marginTop: 10 }} />}
        </Card>
      )}

      <Card>
        <H style={{ fontSize: 16 }}>{t('language')}</H>
        <LanguagePicker />
      </Card>

      <Btn title={t('logoutBtn')} kind="danger" onPress={onLogout} />
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
