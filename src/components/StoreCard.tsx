import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Store } from '@/lib/data';
import { LatLng, roadKm } from '@/lib/geo';
import { deliveryFee, etaMinutes } from '@/lib/pricing';
import { colors, peso, radius } from '@/lib/theme';
import { useStartErrand } from './useStartErrand';

export default function StoreCard({ r, from, compact }: { r: Store; from: LatLng; compact?: boolean }) {
  const start = useStartErrand();
  const km = roadKm(r.location, from);
  const eta = r.waitMinutes + etaMinutes(km) + 5;
  return (
    <Pressable
      onPress={() => start({ name: r.name, location: r.location }, r.id)}
      style={({ pressed }) => [styles.card, compact && { width: 240, marginRight: 12 }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.banner, { backgroundColor: r.tint }]}>
        <Text style={{ fontSize: compact ? 48 : 60 }}>{r.emoji}</Text>
      </View>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
          <View style={styles.rating}>
            <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
            <Text style={{ fontWeight: '700', marginLeft: 2 }}>{r.rating}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{r.tagline} · {r.address}</Text>
        <Text style={styles.meta}>~{eta} min · {peso(deliveryFee(km))} delivery</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  banner: { height: 110, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '800', fontSize: 16, color: colors.text, flex: 1, marginRight: 8 },
  rating: { flexDirection: 'row', alignItems: 'center' },
  meta: { color: colors.muted, marginTop: 3 },
});
