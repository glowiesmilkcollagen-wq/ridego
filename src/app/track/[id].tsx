import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapPreview from '@/components/MapPreview';
import { MapPin } from '@/components/MapPreview.types';
import { Button, Card, Empty, Row, SectionTitle } from '@/components/ui';
import { cancelOrder, isOpen, Order, rateOrder, useOrder } from '@/lib/api';
import { VEHICLES } from '@/lib/pricing';
import { errorText } from '@/lib/supabase';
import { canCustomerCancel, CARGO, PAYMENT_LABELS, statusText, STEPS } from '@/lib/trips';
import { colors, peso } from '@/lib/theme';

export default function Track() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { order: o, loading, rider, riderProfile, refresh } = useOrder(id);
  const [busy, setBusy] = useState(false);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (!o) return <Empty icon="map-search-outline" title="Order not found" />;

  const pabili = o.kind === 'pabili';
  const accent = pabili ? colors.primary : colors.ride;
  const text = statusText(o);
  const live = isOpen(o);
  const step = STEPS.indexOf(o.status);
  const riderPos = live && o.status !== 'searching' && rider?.lat != null && rider?.lng != null ? { latitude: rider.lat, longitude: rider.lng } : null;
  const pickup = { latitude: o.pickup_lat, longitude: o.pickup_lng };
  const dropoff = { latitude: o.dropoff_lat, longitude: o.dropoff_lng };
  const pins: MapPin[] = [
    { id: 'p', coord: pickup, kind: pabili ? 'store' : 'pickup' },
    { id: 'd', coord: dropoff, kind: 'dropoff' },
    ...(riderPos ? [{ id: 'r', coord: riderPos, kind: 'rider' as const }] : []),
  ];

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      refresh();
    } catch (e) {
      Alert.alert('Something went wrong', errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const onCancel = () =>
    Alert.alert(pabili ? 'Cancel order?' : 'Cancel pasugo?', 'This cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: () => act(() => cancelOrder(o.id)) },
    ]);
  const phone = riderProfile?.phone?.replace(/[^0-9+]/g, '');

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `${pabili ? 'Order' : 'Pasugo'} ${o.code}` }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <MapPreview pins={pins} path={o.path?.length ? o.path : [pickup, dropoff]} height={280} rideIcon={o.vehicle === 'car' ? 'car' : 'motorbike'} />

        <View style={{ padding: 16, gap: 14 }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {o.status === 'searching' && <ActivityIndicator color={accent} />}
              <Text style={[styles.status, { color: o.status === 'cancelled' ? colors.danger : accent }]}>{text.label}</Text>
            </View>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{text.detail}</Text>
            {o.status !== 'cancelled' && (
              <View style={styles.bar}>
                {STEPS.map((s, i) => <View key={s} style={[styles.seg, { backgroundColor: i <= step ? accent : colors.border }]} />)}
              </View>
            )}
          </Card>

          {o.rider_id && o.status !== 'cancelled' && (
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.avatar, { backgroundColor: pabili ? colors.primarySoft : colors.rideSoft }]}>
                <MaterialCommunityIcons name={o.vehicle === 'car' ? 'car' : 'motorbike'} size={26} color={accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{riderProfile?.full_name || 'Your rider'}</Text>
                <Text style={{ color: colors.muted }}>{[rider ? VEHICLES[rider.vehicle].label : null, rider?.plate].filter(Boolean).join(' · ') || 'Rider details'}</Text>
              </View>
              {live && phone ? (
                <>
                  <IconBtn icon="message-text-outline" onPress={() => Linking.openURL(`sms:${phone}`)} />
                  <IconBtn icon="phone-outline" onPress={() => Linking.openURL(`tel:${phone}`)} />
                </>
              ) : null}
            </Card>
          )}

          {o.status === 'delivered' && (
            <Card>
              <SectionTitle>{o.rating ? 'Thanks for your rating!' : `Rate ${riderProfile?.full_name?.split(' ')[0] || 'your rider'}`}</SectionTitle>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} disabled={!!o.rating || busy} onPress={() => act(() => rateOrder(o.id, n))} hitSlop={6}>
                    <MaterialCommunityIcons name={(o.rating ?? 0) >= n ? 'star' : 'star-outline'} size={36} color={colors.warning} />
                  </Pressable>
                ))}
              </View>
            </Card>
          )}

          <Card>
            <StopLine icon={pabili ? 'storefront-outline' : 'map-marker'} color={colors.ride} title={pabili ? 'Buy from' : 'Pick up from'} text={o.pickup_name} />
            <StopLine icon="flag-checkered" color={colors.primary} title={pabili ? 'Deliver to' : 'Bring to'} text={o.dropoff_name} />
            {o.note ? <StopLine icon="note-text-outline" color={colors.muted} title="Instructions" text={o.note} /> : null}
          </Card>

          <Summary o={o} />

          {canCustomerCancel(o) && <Button title={pabili ? 'Cancel order' : 'Cancel pasugo'} variant="outline" color={colors.danger} onPress={onCancel} loading={busy} />}
        </View>
      </ScrollView>
    </View>
  );
}

function Summary({ o }: { o: Order }) {
  const pabili = o.kind === 'pabili';
  const cargo = CARGO[o.cargo ?? 'parcel'];
  const receipt = o.receipt_amount != null ? Number(o.receipt_amount) : null;
  return (
    <Card>
      <SectionTitle>{pabili ? 'Shopping list' : `${cargo.emoji}  ${cargo.label}`}</SectionTitle>
      {pabili
        ? o.items?.map((i) => <Text key={i.id} style={{ color: colors.text, paddingVertical: 3 }}>{i.qty}×  {i.name}</Text>)
        : (
          <View style={{ gap: 4 }}>
            {o.description ? <Text style={{ color: colors.text }}>{o.description}</Text> : null}
            {o.sender ? <Row label={o.cargo === 'person' ? 'Passenger' : 'Hand-over by'} value={contactText(o.sender)} /> : null}
            <Row label="Received by" value={o.receiver ? contactText(o.receiver) : 'You'} />
            <Row label="Vehicle" value={VEHICLES[o.vehicle].label} />
          </View>
        )}
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
      <Row label={`${pabili ? 'Delivery fee' : 'Pasugo fee'} (${Number(o.km).toFixed(1)} km)`} value={peso(Number(o.base_fee))} />
      {Number(o.discount) > 0 && <Row label={`Promo ${o.promo_code}`} value={`−${peso(Number(o.discount))}`} valueColor={colors.ride} />}
      {Number(o.booking_fee) > 0
        ? <Row label="Booking fee" value={peso(Number(o.booking_fee))} />
        : o.commission_waived ? <Row label="Booking fee" value="Waived (beta)" valueColor={colors.ride} /> : null}
      {pabili && <Row label="Items" value={receipt != null ? `${peso(receipt)} (receipt)` : 'Pay rider as per receipt'} />}
      {o.budget ? <Row label="Item spending limit" value={peso(Number(o.budget))} /> : null}
      <Row
        label={`${pabili && receipt != null ? 'Total to pay the rider' : 'You pay'} · ${PAYMENT_LABELS[o.payment]}`}
        value={peso(Number(o.fee) + (pabili && receipt != null ? receipt : 0))} bold
      />
      {pabili && receipt == null && (
        <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 19 }}>
          The rider pays for your items at the store. Repay the exact receipt amount when your order arrives.
        </Text>
      )}
    </Card>
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
