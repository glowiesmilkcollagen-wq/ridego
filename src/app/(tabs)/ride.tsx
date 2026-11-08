import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapPreview from '@/components/MapPreview';
import { MapPin } from '@/components/MapPreview.types';
import PaymentPicker from '@/components/PaymentPicker';
import { Button, Card } from '@/components/ui';
import { roadKm } from '@/lib/geo';
import { etaMinutes, RideType, rideFare, RIDE_TYPES } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import { colors, peso, radius } from '@/lib/theme';

export default function Ride() {
  const { state, setRideStop, swapRideStops, bookRide } = useStore();
  const [type, setType] = useState<RideType>('moto');
  const [showPay, setShowPay] = useState(false);
  const { pickup, dropoff } = state.rideDraft;

  // Default the pickup to the saved home address.
  useEffect(() => {
    if (state.ready && !pickup) setRideStop('pickup', state.home);
  }, [state.ready, pickup, state.home, setRideStop]);

  const km = pickup && dropoff ? roadKm(pickup.location, dropoff.location) : 0;
  const pins: MapPin[] = [
    ...(pickup ? [{ id: 'p', coord: pickup.location, kind: 'pickup' as const }] : []),
    ...(dropoff ? [{ id: 'd', coord: dropoff.location, kind: 'dropoff' as const }] : []),
  ];
  const tooShort = !!pickup && !!dropoff && km < 0.3;

  const book = () => {
    if (!pickup || !dropoff) return;
    const id = bookRide(pickup, dropoff, type);
    setRideStop('dropoff', null);
    router.push(`/track/${id}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.h1}>Book a ride</Text>
        {pins.length > 0 && (
          <MapPreview pins={pins} route={pickup && dropoff ? [pickup.location, dropoff.location] : undefined} height={220} />
        )}

        <View style={{ padding: 16, gap: 14 }}>
          <Card style={{ paddingVertical: 6 }}>
            <StopRow color={colors.ride} label="Pickup" value={pickup?.name} onPress={() => router.push('/place-search?target=pickup')} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border, marginLeft: 34 }} />
              <Pressable accessibilityLabel="Swap pickup and destination" onPress={swapRideStops} style={styles.swap}>
                <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.text} />
              </Pressable>
            </View>
            <StopRow color={colors.primary} label="Destination" value={dropoff?.name} onPress={() => router.push('/place-search?target=dropoff')} />
          </Card>

          {pickup && dropoff ? (
            <>
              <Text style={{ color: colors.muted }}>{km.toFixed(1)} km · about {etaMinutes(km, type)} min trip</Text>
              {(Object.keys(RIDE_TYPES) as RideType[]).map((k) => {
                const t = RIDE_TYPES[k];
                const on = k === type;
                return (
                  <Pressable key={k} onPress={() => setType(k)} style={[styles.option, on && { borderColor: colors.ride, backgroundColor: colors.rideSoft }]}>
                    <MaterialCommunityIcons name={t.icon as any} size={34} color={colors.text} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>
                        {t.label} <Text style={{ color: colors.muted, fontWeight: '400', fontSize: 13 }}>· {t.seats} seat{t.seats > 1 ? 's' : ''}</Text>
                      </Text>
                      <Text style={{ color: colors.muted, marginTop: 2 }}>{t.blurb}</Text>
                    </View>
                    <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{peso(rideFare(km, k))}</Text>
                  </Pressable>
                );
              })}

              <Card style={{ paddingVertical: 8 }}>
                <Pressable onPress={() => setShowPay((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                  <MaterialCommunityIcons name="wallet-outline" size={22} color={colors.text} />
                  <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: colors.text }}>Payment: {state.payment.toUpperCase()}</Text>
                  <MaterialCommunityIcons name={showPay ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
                </Pressable>
                {showPay && <PaymentPicker />}
              </Card>

              {type !== 'car' && (
                <View style={styles.safety}>
                  <MaterialCommunityIcons name="racing-helmet" size={20} color={colors.ride} />
                  <Text style={{ marginLeft: 8, flex: 1, color: colors.text }}>Your rider brings a spare helmet. Please wear it for the whole trip.</Text>
                </View>
              )}

              <Button
                title={tooShort ? 'Destination is too close' : `Book ${RIDE_TYPES[type].label} · ${peso(rideFare(km, type))}`}
                color={colors.ride} onPress={book} disabled={tooShort}
              />
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 24 }}>
              <Text style={{ fontSize: 56 }}>🏍️</Text>
              <Text style={{ fontWeight: '800', fontSize: 18, marginTop: 8, color: colors.text }}>Skip the traffic</Text>
              <Text style={{ color: colors.muted, marginTop: 4, textAlign: 'center' }}>Pick a destination to see motorcycle and car fares.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StopRow({ color, label, value, onPress }: { color: string; label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <View style={{ width: 22, alignItems: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} /></View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        <Text style={{ fontWeight: '700', fontSize: 15, color: value ? colors.text : colors.muted }} numberOfLines={1}>{value ?? 'Where to?'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, padding: 16, paddingBottom: 12 },
  swap: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, borderWidth: 1.5, borderColor: colors.border },
  safety: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.rideSoft, padding: 12, borderRadius: radius.md },
});
