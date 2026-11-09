import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ActivityIndicator, AppState, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from './src/i18n';
import { api, session, setUnauthorizedHandler } from './src/api';
import AuthScreen from './src/screens/AuthScreen';
import PassengerApp from './src/screens/PassengerApp';
import DriverApp from './src/screens/DriverApp';
import { colors } from './src/theme';

function Root() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState({});
  const userRef = useRef(null);
  userRef.current = user;

  const logout = useCallback(async () => { await session.clear(); setUser(null); }, []);
  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  const refresh = useCallback(async () => {
    const d = await api('/api/auth/me', { timeoutMs: 20000 });
    if (d.success) setUser(d.user);
  }, []);

  useEffect(() => {
    (async () => {
      const c = await api('/api/config', { timeoutMs: 70000 });
      if (c.success) setConfig(c.config);
      if (await session.load()) {
        const d = await api('/api/auth/me', { timeoutMs: 70000 });
        if (d.success) setUser(d.user);
        else if (!d.network) await session.clear();
      }
      setBooting(false);
    })();
  }, []);

  // Keep balance / approval status fresh without sockets: poll every 10s while the app is open.
  useEffect(() => {
    if (!user) return undefined;
    const id = setInterval(() => { if (AppState.currentState === 'active' && userRef.current) refresh(); }, 10000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [!!user, refresh]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      {booting ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 14, color: colors.muted, textAlign: 'center' }}>{t('loading')}</Text>
          <Text style={{ marginTop: 6, color: colors.muted, textAlign: 'center', fontSize: 12 }}>{t('serverWaking')}</Text>
        </View>
      ) : !user ? (
        <AuthScreen onAuth={setUser} />
      ) : user.role === 'driver' ? (
        <DriverApp user={user} setUser={setUser} config={config} onLogout={logout} onRefresh={refresh} bottomInset={insets.bottom} />
      ) : (
        <PassengerApp user={user} setUser={setUser} config={config} onLogout={logout} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <Root />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
