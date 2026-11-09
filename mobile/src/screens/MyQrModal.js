import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Btn, Banner, H, Muted } from '../components/UI';
import { useI18n } from '../i18n';
import { api } from '../api';
import { errMsg } from './AuthScreen';

// The passenger's own rotating QR code. The server code lives ~2 minutes, so refresh every 80 seconds.
export default function MyQrModal({ visible, onClose, demo }) {
  const { t, has } = useI18n();
  const [code, setCode] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const d = await api('/api/passenger/qr');
    if (d.success) { setCode(d.token); setErr(''); } else setErr(errMsg(t, has, d));
  }, [t, has]);

  useEffect(() => {
    if (!visible) { setCode(null); setErr(''); return undefined; }
    load();
    const id = setInterval(load, 80000);
    return () => clearInterval(id);
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
        <H>{t('qrTitle')}</H>
        <Muted style={{ marginBottom: 20, textAlign: 'center' }}>{t('qrHint')}</Muted>
        {code ? <QRCode value={code} size={260} /> : err ? null : <ActivityIndicator size="large" />}
        <View style={{ height: 16 }} />
        <Banner text={err} type="danger" />
        {demo && code ? <Text selectable style={{ fontSize: 11, color: '#6b7685', marginBottom: 10 }}>{code}</Text> : null}
        <Muted style={{ marginBottom: 24 }}>{t('qrExpiresSoon')}</Muted>
        <Btn title={t('close')} kind="ghost" onPress={onClose} style={{ alignSelf: 'stretch' }} />
      </View>
    </Modal>
  );
}
