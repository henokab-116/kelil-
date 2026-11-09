import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export function Btn({ title, onPress, kind = 'primary', disabled, loading, style, icon }) {
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : kind === 'success' ? colors.success : 'transparent';
  const fg = kind === 'ghost' ? colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: colors.primary }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{icon ? icon + '  ' : ''}{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, style, ...props }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor="#9aa3b2" autoCapitalize="none" {...props} style={s.input} />
    </View>
  );
}

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;

export function Banner({ text, type = 'info', style }) {
  if (!text) return null;
  const bg = type === 'success' ? '#d1e7dd' : type === 'danger' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#cfe2ff';
  const fg = type === 'success' ? '#0f5132' : type === 'danger' ? '#842029' : type === 'warning' ? '#664d03' : '#084298';
  return (
    <View style={[{ backgroundColor: bg, padding: 12, borderRadius: 10, marginBottom: 12 }, style]}>
      <Text style={{ color: fg, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.chip, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const H = ({ children, style }) => <Text style={[{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 10 }, style]}>{children}</Text>;
export const Muted = ({ children, style }) => <Text style={[{ color: colors.muted, fontSize: 13 }, style]}>{children}</Text>;

// Bottom tab bar. tabs = [{ key, label, icon }]
export function TabBar({ tabs, active, onChange, bottomInset = 0 }) {
  return (
    <View style={[s.tabbar, { paddingBottom: 8 + bottomInset }]}>
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={s.tab}>
            <Text style={{ fontSize: 20, opacity: on ? 1 : 0.55 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: on ? colors.primary : colors.muted }} numberOfLines={1}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius - 2, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  tabbar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2 }
});
