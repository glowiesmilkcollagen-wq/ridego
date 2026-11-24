import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StoreCard from '@/components/StoreCard';
import TripCard from '@/components/TripCard';
import { showBecomeRider } from '@/components/becomeRider';
import { SectionTitle } from '@/components/ui';
import { isOpen, useMyOrders } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { roadKm } from '@/lib/geo';
import { featuredStores, NEARBY_KM, useNearbyStores } from '@/lib/nearby';
import { useStore } from '@/lib/store';
import { colors, radius } from '@/lib/theme';

export default function Home() {
  const { state } = useStore();
  const { userId, profile } = useAuth();
  const { stores, loading: storesLoading } = useNearbyStores(state.home.location);
  const orders = useMyOrders(userId);
  const kmFor = (s: { location: typeof state.home.location }) => roadKm(s.location, state.home.location);
  const active = (orders.data ?? []).filter(isOpen);
  const first = (profile?.full_name || 'there').split(' ')[0];
  // Featured: the nearest branch of each big chain (Jollibee, SM, Mercury Drug, CitiHardware…) within 3 km.
  const topPerCategory = featuredStores(stores);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Pressable style={styles.address} onPress={() => router.push('/place-search?target=home')}>
          <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
          <View style={{ marginLeft: 6, flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Deliver to</Text>
            <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>{state.home.name}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.text} />
        </Pressable>

        <Text style={styles.hello}>Hi {first}, where to today?</Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable style={[styles.service, { backgroundColor: colors.primary }]} onPress={() => router.push('/pabili')}>
            <Text style={styles.serviceEmoji}>🛒</Text>
            <Text style={styles.serviceTitle}>Pabili</Text>
            <Text style={styles.serviceSub}>Food, medicine, groceries — we buy & bring it</Text>
          </Pressable>
          <Pressable style={[styles.service, { backgroundColor: colors.ride }]} onPress={() => router.push('/pasugo')}>
            <Text style={styles.serviceEmoji}>📦</Text>
            <Text style={styles.serviceTitle}>Pasugo</Text>
            <Text style={styles.serviceSub}>We pick up anything</Text>
          </Pressable>
        </View>

        <Pressable style={styles.driverBanner} onPress={showBecomeRider}>
          <MaterialCommunityIcons name="card-account-details-star-outline" size={28} color={colors.text} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '800', color: colors.text }}>Earn as a Pabili rider</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>Get the Pabili Rider app and earn on your own schedule</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>

        {active.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <SectionTitle>In progress</SectionTitle>
            {active.map((o) => <TripCard key={o.id} order={o} />)}
          </View>
        )}

        <SectionTitle style={{ marginTop: 20 }}>Featured stores near you</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {topPerCategory.map((r) => (
            <StoreCard key={r.id} r={r} km={kmFor(r)} compact />
          ))}
        </ScrollView>
        {!storesLoading && !topPerCategory.length && (
          <Text style={{ color: colors.muted }}>No featured stores within {NEARBY_KM} km. See all nearby stores in Pabili, or tap “Buy from any store” there and type the store’s name.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  address: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  hello: { fontSize: 24, fontWeight: '800', color: colors.text, marginVertical: 16 },
  service: { flex: 1, borderRadius: radius.lg, padding: 16, minHeight: 140, justifyContent: 'flex-end' },
  serviceEmoji: { fontSize: 40, position: 'absolute', top: 12, right: 14 },
  serviceTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  serviceSub: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  driverBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF6D6', borderRadius: radius.lg, padding: 14, marginTop: 14,
  },
});
