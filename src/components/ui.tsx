import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/lib/theme';

export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, style, color }: {
  title: string; onPress?: () => void; variant?: 'primary' | 'outline' | 'ghost'; disabled?: boolean; loading?: boolean;
  icon?: string; style?: ViewStyle; color?: string;
}) {
  const c = color ?? colors.primary;
  const bg = variant === 'primary' ? c : 'transparent';
  const fg = variant === 'primary' ? '#fff' : c;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: variant === 'outline' ? c : 'transparent', opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={styles.row}>
          {icon && <MaterialCommunityIcons name={icon as any} size={20} color={fg} style={{ marginRight: 8 }} />}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.section, style]}>{children}</Text>;
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      {icon ? <Text style={{ marginRight: 6 }}>{icon}</Text> : null}
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
      <Text style={{ color: bold ? colors.text : colors.muted, fontWeight: bold ? '700' : '400', fontSize: bold ? 16 : 14 }}>{label}</Text>
      <Text style={{ color: valueColor ?? colors.text, fontWeight: bold ? '700' : '500', fontSize: bold ? 16 : 14 }}>{value}</Text>
    </View>
  );
}

export function Empty({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name={icon as any} size={56} color={colors.border} />
      <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 12, color: colors.text }}>{title}</Text>
      {subtitle ? <Text style={{ color: colors.muted, marginTop: 4, textAlign: 'center' }}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1.5 },
  btnText: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  section: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginRight: 8,
  },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 32, flex: 1 },
});
