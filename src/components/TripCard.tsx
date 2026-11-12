import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isOpen, Order } from '@/lib/api';
import { CARGO, statusText } from '@/lib/trips';
import { colors, peso, radius } from '@/lib/theme';

/** One order in the customer's lists. */
export default function TripCard({ order: o }: { order: Order }) {
  const pabili = o.kind === 'pabili';
  const cargo = CARGO[o.cargo ?? 'parcel'];
  const statusColor = o.status === 'cancelled' ? colors.danger : !isOpen(o) ? colors.muted : pabili ? colors.primary : colors.ride;
  const title = pabili ? o.pickup_name : `${cargo.label} · from ${o.pickup_name}`;
  const count = o.items?.reduce((s, l) => s + l.qty, 0) ?? 0;
  const sub = `${pabili ? `${count} item${count === 1 ? '' : 's'}` : `${Number(o.km).toFixed(1)} km`} · ${new Date(o.created_at).toLocaleDateString()}`;
  return (
    <Pressable onPress={() => router.push(`/track/${o.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
      <View style={[styles.icon, { backgroundColor: pabili ? colors.primarySoft : colors.rideSoft }]}>
        <MaterialCommunityIcons name={(pabili ? 'basket-outline' : cargo.icon) as any} size={22} color={pabili ? colors.primary : colors.ride} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{sub} · {peso(Number(o.fee))}{pabili ? ' delivery' : ''}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusText(o).label}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10, gap: 12,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', fontSize: 15, color: colors.text },
  sub: { color: colors.muted, marginTop: 2 },
  status: { marginTop: 4, fontWeight: '700', fontSize: 13 },
});
