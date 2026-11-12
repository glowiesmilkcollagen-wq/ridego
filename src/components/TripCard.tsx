import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CARGO, getProgress, Trip } from '@/lib/trips';
import { colors, peso, radius } from '@/lib/theme';

export default function TripCard({ trip, now }: { trip: Trip; now: number }) {
  const p = getProgress(trip, now);
  const pabili = trip.kind === 'pabili';
  const status = p.cancelled ? 'Cancelled' : p.phase.label;
  const statusColor = p.cancelled ? colors.danger : p.done ? colors.muted : pabili ? colors.primary : colors.ride;
  const title = pabili ? trip.pickup.name : `${CARGO[trip.cargo ?? 'parcel'].label} · from ${trip.pickup.name}`;
  const sub = pabili ? `${trip.items?.reduce((s, l) => s + l.qty, 0)} items` : `${trip.km.toFixed(1)} km · ${new Date(trip.createdAt).toLocaleDateString()}`;
  return (
    <Pressable onPress={() => router.push(`/track/${trip.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
      <View style={[styles.icon, { backgroundColor: pabili ? colors.primarySoft : colors.rideSoft }]}>
        <MaterialCommunityIcons name={(pabili ? 'basket-outline' : CARGO[trip.cargo ?? 'parcel'].icon) as any} size={22} color={pabili ? colors.primary : colors.ride} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{sub} · {peso(trip.total)}{pabili ? ' delivery' : ''}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
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
