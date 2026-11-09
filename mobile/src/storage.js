import AsyncStorage from '@react-native-async-storage/async-storage';

// Small safe wrapper: storage problems never crash the app.
export const store = {
  get: async (k) => { try { return await AsyncStorage.getItem(k); } catch { return null; } },
  set: async (k, v) => { try { await AsyncStorage.setItem(k, v); } catch { /* ignore */ } },
  del: async (k) => { try { await AsyncStorage.removeItem(k); } catch { /* ignore */ } },
  getJson: async (k, fallback) => {
    try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  setJson: async (k, v) => { try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
};
