import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapPreview from '@/components/MapPreview';
import { MapPin } from '@/components/MapPreview.types';
import { Button, Card, Empty, Row, SectionTitle } from '@/components/ui';
import { VEHICLES } from '@/lib/pricing';
import { canCancel, CARGO, getProgress, PAYMENT_LABELS, PHASES } from '@/lib/trips';
import { useNow, useStore } from '@/lib/store';
import { colors, peso, radius } from '@/lib/theme';

export default function Track() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, cancelTrip, rateTrip } = useStore();
  const now = useNow(1000);
  const trip = state.trips.find((t) => t.id === id);
  if (!trip) return <Empty icon="map-search-outline" title="Trip not found" />;

  const pabili = trip.kind === 'pabili';
  const accent = pabili ? colors.primary : colors.ride;
  const p = getProgress(trip, now);
  const phases = PHASES[trip.kind];
  const live = !p.done && !p.cancelled;
  const showRider = p.phase.key !== 'searching';

  const pins: MapPin[] = [
    { id: 'p', coord: trip.pickup.location, kind: pabili ? 'store' : 'pickup' },
    { id: 'd', coord: trip.dropoff.location, kind: 'dropoff' },
    ...(live && p.riderPos ? [{ id: 'r', coord: p.riderPos, kind: 'rider' as const }] : []),
  ];

  const onCancel = () =>
    Alert.alert(pabili ? 'Cancel order?' : 'Cancel pasugo?', 'This cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: () => cancelTrip(trip.id) },
    ]);

  const mins = Math.max(1, Math.ceil(p.secondsLeft / 60));

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: pabili ? `Order ${trip.id}` : `Pasugo ${trip.id}` }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <MapPreview pins={pins} path={trip.path ?? [trip.pickup.location, trip.dropoff.location]} height={280} rideIcon={trip.vehicle === 'car' ? 'car' : 'motorbike'} />

        <View style={{ padding: 16, gap: 14 }}>
          <Card>
            <Text style={[styles.status, { color: p.cancelled ? colors.danger : accent }]}>
              {p.cancelled ? 'Cancelled' : p.phase.label}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {p.cancelled ? 'No charge was made.' : live ? `${p.phase.detail} · ~${mins} min left (demo speed)` : p.phase.detail}
            </Text>
            <View style={styles.bar}>
              {phases.map((ph, i) => (
                <View key={ph.key} style={[styles.seg, { backgroundColor: !p.cancelled && i <= p.index ? accent : colors.border }]} />
              ))}
            </View>
          </Card>

          {showRider && !p.cancelled && (
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.avatar, { backgroundColor: pabili ? colors.primarySoft : colors.rideSoft }]}>
                <MaterialCommunityIcons name={trip.vehicle === 'car' ? 'car' : 'motorbike'} size={26} color={accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{trip.rider.name}</Text>
                <Text style={{ color: colors.muted }}>{trip.rider.plate} · ★ {trip.rider.rating}</Text>
              </View>
              {live && (
                <>
                  <IconBtn icon="message-text-outline" onPress={() => Linking.openURL('sms:')} />
                  <IconBtn icon="phone-outline" onPress={() => Linking.openURL('tel:')} />
                </>
              )}
            </Card>
          )}

          {p.done && (
            <Card>
              <SectionTitle>{trip.rating ? 'Thanks for your rating!' : `Rate ${trip.rider.name}`}</SectionTitle>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => rateTrip(trip.id, n)} hitSlop={6}>
                    <MaterialCommunityIcons name={(trip.rating ?? 0) >= n ? 'star' : 'star-outline'} size={36} color={colors.warning} />
                  </Pressable>
                ))}
              </View>
            </Card>
          )}

          <Card>
            <StopLine icon={pabili ? 'storefront-outline' : 'map-marker'} color={colors.ride} title={pabili ? 'Buy from' : 'Pick up from'} text={trip.pickup.name} />
            <StopLine icon="flag-checkered" color={colors.primary} title={pabili ? 'Deliver to' : 'Bring to'} text={trip.dropoff.name} />
            {trip.note ? <StopLine icon="note-text-outline" color={colors.muted} title="Note" text={trip.note} /> : null}
          </Card>

          <Card>
            <SectionTitle>{pabili ? 'Shopping list' : `${CARGO[trip.cargo ?? 'parcel'].emoji}  ${CARGO[trip.cargo ?? 'parcel'].label}`}</SectionTitle>
            {!pabili && (
              <View style={{ gap: 4 }}>
                {trip.description ? <Text style={{ color: colors.text }}>{trip.description}</Text> : null}
                {trip.sender ? <Row label={trip.cargo === 'person' ? 'Passenger' : 'Hand-over by'} value={contactText(trip.sender)} /> : null}
                <Row label="Received by" value={trip.receiver ? contactText(trip.receiver) : 'You'} />
                <Row label="Vehicle" value={VEHICLES[trip.vehicle ?? 'moto'].label} />
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
              </View>
            )}
            {trip.items?.map((i) => (
              <Text key={i.id} style={{ color: colors.text, paddingVertical: 3 }}>{i.qty}×  {i.name}</Text>
            ))}
            {pabili && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />}
            {trip.lines.map((l) => <Row key={l.label} label={l.label} value={peso(l.amount)} />)}
            {pabili && <Row label="Items" value="Pay rider as per receipt" />}
            {trip.budget ? <Row label="Item spending limit" value={peso(trip.budget)} /> : null}
            <Row label={`${pabili ? 'Delivery fee' : 'Total'} · ${PAYMENT_LABELS[trip.payment]}`} value={peso(trip.total)} bold />
            {pabili && (
              <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 19 }}>
                The rider pays for your items at the store. Repay the exact receipt amount when your order arrives.
              </Text>
            )}
          </Card>

          {canCancel(trip, now) && <Button title={pabili ? 'Cancel order' : 'Cancel pasugo'} variant="outline" color={colors.danger} onPress={onCancel} />}
        </View>
      </ScrollView>
    </View>
  );
}

const contactText = (c: { name: string; phone: string }) => [c.name, c.phone].filter(Boolean).join(' · ');

function IconBtn({ icon, onPress }: { icon: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.iconBtn} hitSlop={4}>
      <MaterialCommunityIcons name={icon as any} size={20} color={colors.text} />
    </Pressable>
  );
}

function StopLine({ icon, color, title, text }: { icon: string; color: string; title: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{title}</Text>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { fontSize: 22, fontWeight: '800' },
  bar: { flexDirection: 'row', gap: 6, marginTop: 14 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
