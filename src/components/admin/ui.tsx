import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/lib/theme';

/** Building blocks for the admin dashboard pages. */

/** Yes/no question: window.confirm on web (Alert buttons don't show there), Alert on phones. */
export function confirmAction(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
  } else {
    Alert.alert(title, message, [{ text: 'No', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: onYes }]);
  }
}
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.muted, marginTop: 4 }}>{subtitle}</Text> : null}
        </View>
        {actions}
      </View>
      {children}
    </ScrollView>
  );
}

export function Panel({ title, children, style, right }: { title?: string; children: React.ReactNode; style?: ViewStyle; right?: React.ReactNode }) {
  return (
    <View style={[styles.panel, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text, flex: 1 }}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' }) {
  return (
    <View style={[styles.panel, { flex: 1, minWidth: 170 }]}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ fontSize: 26, fontWeight: '800', marginTop: 4, color: tone === 'good' ? colors.ride : tone === 'warn' ? colors.warning : colors.text }}>{value}</Text>
      {hint ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{hint}</Text> : null}
    </View>
  );
}

/** A simple table. `widths` are flex weights per column. */
export function Table({ head, rows, widths, empty = 'Nothing here yet.' }: { head: string[]; rows: React.ReactNode[][]; widths?: number[]; empty?: string }) {
  const w = (i: number) => ({ flex: widths?.[i] ?? 1, minWidth: 0 });
  return (
    <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ minWidth: Math.max(640, head.length * 120), flex: 1 }}>
        <View style={[styles.row, { borderBottomWidth: 2 }]}>
          {head.map((h, i) => <Text key={h + i} style={[styles.th, w(i)]}>{h}</Text>)}
        </View>
        {rows.length === 0 ? <Text style={{ color: colors.muted, padding: 12 }}>{empty}</Text> : rows.map((r, ri) => (
          <View key={ri} style={styles.row}>
            {r.map((c, i) => (
              <View key={i} style={[r.length === 1 ? { flex: 1 } : w(i), { paddingRight: 8 }]}>{typeof c === 'string' || typeof c === 'number' ? <Text style={styles.td}>{c}</Text> : c}</View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  const bg = { neutral: colors.border, good: colors.rideSoft, warn: '#FFF4D6', bad: '#FDE2E2', info: '#E0F2FE' }[tone];
  const fg = { neutral: colors.text, good: colors.ride, warn: '#9A6700', bad: colors.danger, info: '#075985' }[tone];
  return <Text style={{ alignSelf: 'flex-start', backgroundColor: bg, color: fg, fontWeight: '700', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' }}>{text}</Text>;
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 160, gap: 4 }}>
      <Text style={{ fontWeight: '600', color: colors.text, fontSize: 13 }}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline && { minHeight: 64, textAlignVertical: 'top' }]} />
      {hint ? <Text style={{ color: colors.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.seg, value === o.value && { backgroundColor: colors.text, borderColor: colors.text }]}>
          <Text style={{ fontWeight: '700', color: value === o.value ? '#fff' : colors.text, fontSize: 13 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SmallButton({ title, onPress, tone = 'default', disabled }: { title: string; onPress: () => void; tone?: 'default' | 'primary' | 'danger'; disabled?: boolean }) {
  const bg = tone === 'primary' ? colors.ride : tone === 'danger' ? '#fff' : '#fff';
  const fg = tone === 'primary' ? '#fff' : tone === 'danger' ? colors.danger : colors.text;
  const border = tone === 'primary' ? colors.ride : tone === 'danger' ? colors.danger : colors.border;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.small, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  panel: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { fontWeight: '800', color: colors.muted, fontSize: 12, textTransform: 'uppercase', paddingRight: 8 },
  td: { color: colors.text, fontSize: 14 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: colors.text, backgroundColor: '#fff' },
  seg: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  small: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
});
