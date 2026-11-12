import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StoreCard from '@/components/StoreCard';
import TripCard from '@/components/TripCard';
import { SectionTitle } from '@/components/ui';
import { CATEGORIES, STORES } from '@/lib/data';
import { getProgress } from '@/lib/trips';
import { useStoreDistances } from '@/lib/routing';
import { useNow, useStore } from '@/lib/store';
import { colors, radius } from '@/lib/theme';

/** Best-rated store of each kind, so Home shows that pabili is not only for food. */
const TOP_PER_CATEGORY = CATEGORIES.flatMap((c) => {
  const best = STORES.filter((s) => s.category === c.key).sort((a, b) => b.rating - a.rating)[0];
  return best ? [best] : [];
});

export default function Home() {
  const { state } = useStore();
  const kmFor = useStoreDistances(state.home.location);
  const now = useNow(2000);
  const active = state.trips.filter((t) => {
    const p = getProgress(t, now);
    return !p.done && !p.cancelled;
  });
  const first = state.profile.name.split(' ')[0];

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
            <Text style={styles.serviceSub}>We pick up anything — or anyone</Text>
          </Pressable>
        </View>

        <Pressable style={styles.driverBanner} onPress={() => Alert.alert('Become a RideGo rider', 'Riders use the separate RideGo Rider app to receive jobs, navigate and track earnings. It will be available on the App Store and Google Play.')}>
          <MaterialCommunityIcons name="card-account-details-star-outline" size={28} color={colors.text} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '800', color: colors.text }}>Earn as a RideGo rider</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>Get the RideGo Rider app and earn on your own schedule</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>

        {active.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <SectionTitle>In progress</SectionTitle>
            {active.map((t) => <TripCard key={t.id} trip={t} now={now} />)}
          </View>
        )}

        <SectionTitle style={{ marginTop: 20 }}>Pabili from places near you</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {TOP_PER_CATEGORY.map((r) => (
            <StoreCard key={r.id} r={r} km={kmFor(r.id)} compact />
          ))}
        </ScrollView>
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
