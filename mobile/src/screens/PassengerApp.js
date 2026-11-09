import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, RefreshControl } from 'react-native';
import { Btn, Card, Banner, Field, H, Muted, TabBar } from '../components/UI';
import MyQrModal from './MyQrModal';
import GameScreen from './GameScreen';
import Profile from './Profile';
import { useI18n } from '../i18n';
import { api } from '../api';
import { colors, money } from '../theme';
import { errMsg } from './AuthScreen';

const fmtTime = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return ''; } };

function History({ user, refreshKey }) {
  const { t, has } = useI18n();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    const d = await api('/api/wallet/transactions');
    setBusy(false);
    if (d.success) { setRows(d.transactions); setErr(''); } else setErr(errMsg(t, has, d));
  }, [t, has]);
  useEffect(() => { load(); }, [load, refreshKey, user.balance]);

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={rows}
      keyExtractor={(x, i) => String(x.id || i)}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
      ListHeaderComponent={<><H>{t('historyTitle')}</H><Banner text={err} type="danger" /></>}
      ListEmptyComponent={err ? null : <Muted style={{ textAlign: 'center', marginTop: 30 }}>{t('noTx')}</Muted>}
      renderItem={({ item }) => {
        const credit = item.type === 'credit';
        return (
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{item.title}</Text>
              <Muted>{fmtTime(item.createdAt)}</Muted>
            </View>
            <Text style={{ fontWeight: '800', color: credit ? colors.success : colors.danger }}>{credit ? '+' : '-'}{money(item.amount)} ETB</Text>
          </Card>
        );
      }}
    />
  );
}

export default function PassengerApp({ user, setUser, config, onLogout, bottomInset }) {
  const { t, has } = useI18n();
  const [tab, setTab] = useState('home');
  const [qrOpen, setQrOpen] = useState(false);
  const [topup, setTopup] = useState('50');
  const [msg, setMsg] = useState({ text: '', type: 'info' });
  const [busy, setBusy] = useState(false);

  async function doTopup() {
    setBusy(true);
    const d = await api('/api/wallet/topup', { method: 'POST', body: { amount: topup } });
    setBusy(false);
    if (d.success) { setUser({ ...user, balance: d.newBalance }); setMsg({ text: t('topupDone'), type: 'success' }); }
    else setMsg({ text: errMsg(t, has, d), type: 'danger' });
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Muted>{t('welcome')}</Muted>
            <H style={{ fontSize: 24 }}>{user.name}</H>
            <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
              <Text style={{ color: '#cfe2ff', fontWeight: '700' }}>{t('balanceLabel')}</Text>
              <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900' }}>{money(user.balance)} <Text style={{ fontSize: 18 }}>ETB</Text></Text>
              <Text style={{ color: '#cfe2ff', marginTop: 4 }}>{t('cardLabel')}: {user.cardUid}</Text>
            </Card>
            <Btn title={'▦  ' + t('qrBtn')} onPress={() => setQrOpen(true)} />
            {config.demo && (
              <Card style={{ marginTop: 14 }}>
                <Banner text={msg.text} type={msg.type} />
                <Field label={t('amountLabel')} value={topup} onChangeText={setTopup} keyboardType="numeric" />
                <Btn title={t('btnPayTelebirr')} kind="success" onPress={doTopup} loading={busy} />
              </Card>
            )}
          </ScrollView>
        )}
        {tab === 'history' && <History user={user} />}
        {tab === 'play' && <GameScreen />}
        {tab === 'profile' && <Profile user={user} onUser={setUser} onLogout={onLogout} />}
      </View>
      <TabBar
        bottomInset={bottomInset}
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'home', label: t('navHome'), icon: '🏠' },
          { key: 'history', label: t('navTx'), icon: '🧾' },
          { key: 'play', label: t('navPlay'), icon: '🎮' },
          { key: 'profile', label: t('navProfile'), icon: '👤' }
        ]}
      />
      <MyQrModal visible={qrOpen} onClose={() => setQrOpen(false)} demo={config.demo} />
    </View>
  );
}
