import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Restaurant } from '@/lib/data';
import { LatLng, roadKm } from '@/lib/geo';
import { deliveryFee, etaMinutes } from '@/lib/pricing';
import { colors, peso, radius } from '@/lib/theme';

export default function RestaurantCard({ r, from, compact }: { r: Restaurant; from: LatLng; compact?: boolean }) {
  const km = roadKm(r.location, from);
  const eta = r.prepMinutes + etaMinutes(km);
  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${r.id}`)}
      style={({ pressed }) => [styles.card, compact && { width: 240, marginRight: 12 }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.banner, { backgroundColor: r.tint }]}>
        <Text style={{ fontSize: compact ? 48 : 60 }}>{r.emoji}</Text>
        {r.promo ? <View style={styles.promo}><Text style={styles.promoText}>{r.promo}</Text></View> : null}
      </View>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
          <View style={styles.rating}>
            <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
            <Text style={{ fontWeight: '700', marginLeft: 2 }}>{r.rating}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{'₱'.repeat(r.priceLevel)} · {r.cuisine}</Text>
        <Text style={styles.meta}>{eta}–{eta + 10} min · {peso(deliveryFee(km))} delivery</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  banner: { height: 110, alignItems: 'center', justifyContent: 'center' },
  promo: { position: 'absolute', left: 10, top: 10, backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  promoText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  name: { fontWeight: '800', fontSize: 16, color: colors.text, flex: 1, marginRight: 8 },
  rating: { flexDirection: 'row', alignItems: 'center' },
  meta: { color: colors.muted, marginTop: 3 },
});
