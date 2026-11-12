import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapPreview from '@/components/MapPreview';
import { useRider } from '@/components/rider/RiderContext';
import { useLocationSharing } from '@/components/rider/useLocationSharing';
import { Button, Card, Empty, SectionTitle } from '@/components/ui';
import {
  acceptOrder, ACTIVE_STATUSES, advanceOrder, Order, releaseOrder, setOnline, useCustomerProfile, useOpenJobs, useRiderOrders,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { deliveredSince, nextStepLabel, RIDER_TODO, summarize } from '@/lib/driver';
import { percent } from '@/lib/pricing';
import { errorText } from '@/lib/supabase';
import { CARGO, PAYMENT_LABELS } from '@/lib/trips';
import { colors, peso, radius } from '@/lib/theme';

export default function Jobs() {
  const { userId, profile } = useAuth();
  const { rider, setRider } = useRider();
  const orders = useRiderOrders(userId);
  const active = (orders.data ?? []).find((o) => ACTIVE_STATUSES.includes(o.status));
  const online = !!rider?.online;
  const open = useOpenJobs(online && !active);
  const locationProblem = useLocationSharing(online);
  const today = summarize(deliveredSince(orders.data ?? [], 'today'));
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Not done', errorText(e));
    } finally {
      setBusy(null);
      orders.refresh();
      open.refresh();
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.h1}>Hi {(profile?.full_name || 'Rider').split(' ')[0]}</Text>
        <Card style={[styles.status, online && { backgroundColor: colors.rideSoft, borderColor: colors.ride }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{online ? 'You are online' : 'You are offline'}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{online ? 'Receiving pabili and pasugo requests' : 'Go online to start earning'}</Text>
          </View>
          <Switch
            value={online}
            disabled={busy === 'online'}
            onValueChange={(v) => run('online', async () => setRider(await setOnline(v)))}
            trackColor={{ true: colors.ride }}
          />
        </Card>
        {online && locationProblem ? <Text style={{ color: colors.warning }}>{locationProblem}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Earned today" value={peso(today.earned)} />
          <Stat label="Jobs today" value={String(today.jobs)} />
          <Stat label="Cash to remit" value={peso(today.toRemit)} />
        </View>

        {active ? (
          <ActiveJob key={active.id} o={active} busy={busy} run={run} />
        ) : online ? (
          <View>
            <SectionTitle>Incoming requests</SectionTitle>
            {(open.data ?? []).map((o) => (
              <Card key={o.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons name={(o.kind === 'pabili' ? 'basket-outline' : CARGO[o.cargo ?? 'parcel'].icon) as any} size={22} color={o.kind === 'pabili' ? colors.primary : colors.ride} />
                  <Text style={{ fontWeight: '800', marginLeft: 8, flex: 1, color: colors.text }}>{o.kind === 'pabili' ? 'Pabili' : 'Pasugo'} · {Number(o.km).toFixed(1)} km</Text>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: colors.ride }}>{peso(Number(o.rider_earning))}</Text>
                </View>
                <Text style={styles.line}><Text style={{ color: colors.ride }}>●</Text>  {o.pickup_name}</Text>
                <Text style={styles.line}><Text style={{ color: colors.primary }}>●</Text>  {o.dropoff_name}</Text>
                {o.items ? <Text style={styles.line}>🛒 {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</Text> : null}
                {o.description ? <Text style={styles.line}>{CARGO[o.cargo ?? 'parcel'].emoji} {o.description}</Text> : null}
                <Text style={[styles.line, { color: colors.muted }]}>
                  {o.customer_name || 'Customer'}{o.kind === 'pabili' ? ' · you pay at the store' : ''}{o.vehicle === 'car' ? ' · car' : ''}
                </Text>
                <Text style={[styles.line, { color: colors.muted }]}>
                  Fee {peso(Number(o.base_fee))} ({PAYMENT_LABELS[o.payment]}) · your {percent(Number(o.rider_share))} share {peso(Number(o.rider_earning))}
                </Text>
                <Button title="Accept" color={colors.ride} style={{ marginTop: 10 }} loading={busy === o.id} onPress={() => run(o.id, () => acceptOrder(o.id))} />
              </Card>
            ))}
            {open.loaded && !(open.data ?? []).length && <Text style={{ color: colors.muted, textAlign: 'center' }}>No requests right now. New ones appear here automatically.</Text>}
          </View>
        ) : (
          <Empty icon="sleep" title="Offline" subtitle="Switch on to see pabili and pasugo requests near you." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Lets the rider pick a navigation app; each falls back to Google Maps in the browser. */
function openNavigation(o: Order) {
  const toPickup = o.status === 'accepted';
  const [lat, lng, name] = toPickup ? [o.pickup_lat, o.pickup_lng, o.pickup_name] : [o.dropoff_lat, o.dropoff_lng, o.dropoff_name];
  const ll = `${lat},${lng}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving`;
  const go = (url: string) => Linking.openURL(url).catch(() => Linking.openURL(web));
  Alert.alert(`Navigate to ${toPickup ? 'pickup' : 'drop-off'}`, name, [
    { text: 'Google Maps', onPress: () => go(Platform.OS === 'ios' ? `comgooglemaps://?daddr=${ll}&directionsmode=driving` : `google.navigation:q=${ll}`) },
    { text: 'Waze', onPress: () => go(`https://waze.com/ul?ll=${ll}&navigate=yes`) },
    ...(Platform.OS === 'ios' ? [{ text: 'Apple Maps', onPress: () => go(`http://maps.apple.com/?daddr=${ll}&dirflg=d`) }] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

const call = (phone?: string | null) => {
  const p = phone?.replace(/[^0-9+]/g, '');
  if (p) Linking.openURL(`tel:${p}`);
};

function ActiveJob({ o, busy, run }: { o: Order; busy: string | null; run: (key: string, fn: () => Promise<unknown>) => void }) {
  const customer = useCustomerProfile(o.customer_id);
  const [receipt, setReceipt] = useState('');
  const pabili = o.kind === 'pabili';
  const buying = pabili && o.status === 'at_pickup';
  const next = nextStepLabel(o);
  const receiptValue = Number(receipt.replace(/[^0-9.]/g, ''));
  const contacts = [
    { label: `Customer · ${customer.data?.full_name || o.customer_name}`, phone: customer.data?.phone },
    ...(o.sender?.phone ? [{ label: `${o.cargo === 'person' ? 'Passenger' : 'At pickup'} · ${o.sender.name || o.sender.phone}`, phone: o.sender.phone }] : []),
    ...(o.receiver?.phone ? [{ label: `Receiver · ${o.receiver.name || o.receiver.phone}`, phone: o.receiver.phone }] : []),
  ].filter((c) => c.phone);

  const advance = () => {
    if (buying && !receiptValue) return Alert.alert('Enter the receipt total', 'Type how much you paid at the store, as shown on the receipt.');
    run('advance', () => advanceOrder(o.id, buying ? receiptValue : undefined));
  };

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <MapPreview
        height={200}
        pins={[
          { id: 'p', coord: { latitude: o.pickup_lat, longitude: o.pickup_lng }, kind: pabili ? 'store' : 'pickup' },
          { id: 'd', coord: { latitude: o.dropoff_lat, longitude: o.dropoff_lng }, kind: 'dropoff' },
        ]}
        path={o.path?.length ? o.path : [{ latitude: o.pickup_lat, longitude: o.pickup_lng }, { latitude: o.dropoff_lat, longitude: o.dropoff_lng }]}
      />
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.ride, fontWeight: '800' }}>{RIDER_TODO[o.status]?.[o.kind]}</Text>
        <Text style={{ fontWeight: '800', fontSize: 18, marginTop: 4, color: colors.text }}>{o.status === 'picked_up' ? o.dropoff_name : o.pickup_name}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          Job {o.code} · {Number(o.km).toFixed(1)} km · you earn {peso(Number(o.rider_earning))}
        </Text>

        {(pabili ? !!o.items?.length : !!o.description) && o.status !== 'picked_up' && (
          <View style={styles.list}>
            <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 4 }}>{pabili ? 'Shopping list' : CARGO[o.cargo ?? 'parcel'].label}</Text>
            {pabili
              ? o.items!.map((i) => <Text key={i.id} style={{ color: colors.text, paddingVertical: 2 }}>•  {i.qty}× {i.name}</Text>)
              : <Text style={{ color: colors.text }}>{o.description}</Text>}
            {o.budget ? <Text style={{ color: colors.muted, marginTop: 4 }}>Spend at most {peso(Number(o.budget))}</Text> : null}
            {o.note ? <Text style={{ color: colors.muted, marginTop: 4 }}>Note: {o.note}</Text> : null}
          </View>
        )}

        {contacts.map((c) => (
          <Pressable key={c.label} onPress={() => call(c.phone)} style={styles.contact}>
            <MaterialCommunityIcons name="phone-outline" size={18} color={colors.ride} />
            <Text style={{ marginLeft: 8, color: colors.text, flex: 1 }} numberOfLines={1}>{c.label}</Text>
            <Text style={{ color: colors.ride, fontWeight: '700' }}>Call</Text>
          </Pressable>
        ))}

        {buying && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.muted, marginBottom: 6 }}>Receipt total you paid</Text>
            <View style={styles.receipt}>
              <Text style={{ fontWeight: '700', color: colors.text }}>₱</Text>
              <TextInput
                value={receipt} onChangeText={setReceipt} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.muted}
                style={{ flex: 1, marginLeft: 6, paddingVertical: 10, fontSize: 16, color: colors.text }}
              />
            </View>
          </View>
        )}

        {o.status === 'picked_up' && <Collect o={o} />}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button title="Navigate" icon="navigation-variant" variant="outline" color={colors.text} style={{ flex: 1 }} onPress={() => openNavigation(o)} />
          {next && <Button title={next} color={colors.ride} style={{ flex: 1.4 }} onPress={advance} loading={busy === 'advance'} />}
        </View>
        {o.status === 'accepted' && (
          <Button
            title="Drop job" variant="ghost" color={colors.danger} style={{ marginTop: 6 }}
            onPress={() => Alert.alert('Drop this job?', 'It goes back to other riders. Frequent drops lower your acceptance rate.', [
              { text: 'Keep job', style: 'cancel' },
              { text: 'Drop', style: 'destructive', onPress: () => run('drop', () => releaseOrder(o.id)) },
            ])}
          />
        )}
      </View>
    </Card>
  );
}

/** What the rider collects at drop-off: the receipt for pabili items, plus the fee only if paid in cash. */
function Collect({ o }: { o: Order }) {
  const items = o.kind === 'pabili' ? Number(o.receipt_amount ?? 0) : 0;
  const fee = o.payment === 'cash' ? Number(o.fee) : 0;
  const earned = Number(o.rider_earning);
  const parts = [items ? `${peso(items)} items (receipt)` : '', fee ? `${peso(fee)} fee (cash)` : ''].filter(Boolean);
  return (
    <View style={styles.collect}>
      <Text style={{ color: colors.text }}>Collect from customer</Text>
      <Text style={{ fontWeight: '800', fontSize: 22, color: colors.text, marginTop: 2 }}>{peso(items + fee)}</Text>
      <Text style={{ color: colors.muted, marginTop: 2 }}>{parts.length ? parts.join(' + ') : `Nothing to collect — fee paid by ${PAYMENT_LABELS[o.payment]}`}</Text>
      {fee > 0 && (
        <Text style={{ color: colors.muted, marginTop: 2 }}>
          {fee > earned ? `Keep ${peso(earned)}, remit ${peso(fee - earned)} to RideGo` : fee === earned ? 'Keep it all — nothing to remit' : `Keep it all; RideGo owes you ${peso(earned - fee)} (promo)`}
        </Text>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 4, color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  status: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  line: { marginTop: 3, color: colors.text },
  list: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, marginTop: 12 },
  contact: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  receipt: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12 },
  collect: { backgroundColor: colors.rideSoft, borderRadius: radius.md, padding: 12, marginTop: 12 },
});
