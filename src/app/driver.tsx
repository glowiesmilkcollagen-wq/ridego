import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MapPreview from '@/components/MapPreview';
import { Button, Card, Empty, SectionTitle } from '@/components/ui';
import { DriverJob, generateJobs, STAGE_STATUS, STAGES } from '@/lib/driver';
import { useStore } from '@/lib/store';
import { CARGO } from '@/lib/trips';
import { colors, peso, radius } from '@/lib/theme';

export default function Driver() {
  const { state, setOnline, acceptJob, advanceJob, declineActive } = useStore();
  const { driver } = state;
  const [jobs, setJobs] = useState<DriverJob[]>([]);

  // While online and idle, refresh incoming requests every 15 seconds.
  useEffect(() => {
    if (!driver.online || driver.active) return;
    setJobs(generateJobs(3));
    const t = setInterval(() => setJobs(generateJobs(3)), 15000);
    return () => clearInterval(t);
  }, [driver.online, driver.active]);

  const today = new Date().toDateString();
  const todayJobs = driver.history.filter((j) => j.completedAt && new Date(j.completedAt).toDateString() === today);

  const navigate = (job: DriverJob) => {
    const target = job.stage === 0 ? job.pickup.location : job.dropoff.location;
    const ll = `${target.latitude},${target.longitude}`;
    const url = Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${ll}` : `google.navigation:q=${ll}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${ll}`));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Card style={[styles.status, driver.online && { backgroundColor: colors.rideSoft, borderColor: colors.ride }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{driver.online ? 'You are online' : 'You are offline'}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{driver.online ? 'Receiving pabili and pasugo requests' : 'Go online to start earning'}</Text>
        </View>
        <Switch
          value={driver.online}
          onValueChange={(v) => {
            if (!v && driver.active) return Alert.alert('Finish your current job first');
            setOnline(v);
          }}
          trackColor={{ true: colors.ride }}
        />
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Today" value={peso(todayJobs.reduce((s, j) => s + j.payout, 0))} />
        <Stat label="Total earned" value={peso(driver.earnings)} />
        <Stat label="Jobs done" value={String(driver.completed)} />
      </View>

      {driver.active ? (
        <ActiveJob key={driver.active.id} job={driver.active} onNext={advanceJob} onNavigate={() => navigate(driver.active!)} onCancel={() =>
          Alert.alert('Drop this job?', 'Frequent cancellations lower your acceptance rate.', [
            { text: 'Keep job', style: 'cancel' },
            { text: 'Drop', style: 'destructive', onPress: declineActive },
          ])}
        />
      ) : driver.online ? (
        <View>
          <SectionTitle>Incoming requests</SectionTitle>
          {jobs.map((j) => (
            <Card key={j.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name={(j.kind === 'pabili' ? 'basket-outline' : CARGO[j.cargo ?? 'parcel'].icon) as any} size={22} color={j.kind === 'pabili' ? colors.primary : colors.ride} />
                <Text style={{ fontWeight: '800', marginLeft: 8, flex: 1, color: colors.text }}>{j.kind === 'pabili' ? 'Pabili' : 'Pasugo'} · {j.km.toFixed(1)} km</Text>
                <Text style={{ fontWeight: '800', fontSize: 18, color: colors.ride }}>{peso(j.payout)}</Text>
              </View>
              <Text style={styles.line}><Text style={{ color: colors.ride }}>●</Text>  {j.pickup.name}</Text>
              <Text style={styles.line}><Text style={{ color: colors.primary }}>●</Text>  {j.dropoff.name}</Text>
              {j.items ? <Text style={styles.line}>🛒 {j.items.join(', ')}</Text> : null}
              <Text style={[styles.line, { color: colors.muted }]}>{j.customer} · {j.detail}{j.kind === 'pabili' ? ' · you pay at the store' : ''}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Button title="Skip" variant="outline" color={colors.muted} style={{ flex: 1 }} onPress={() => setJobs((js) => js.filter((x) => x.id !== j.id))} />
                <Button title="Accept" color={colors.ride} style={{ flex: 2 }} onPress={() => acceptJob(j)} />
              </View>
            </Card>
          ))}
          {jobs.length === 0 && <Text style={{ color: colors.muted, textAlign: 'center' }}>Looking for requests near you…</Text>}
        </View>
      ) : (
        <Empty icon="sleep" title="Offline" subtitle="Switch on to see pabili and pasugo requests near you." />
      )}

      {driver.history.length > 0 && (
        <View>
          <SectionTitle>Recent jobs</SectionTitle>
          {driver.history.slice(0, 10).map((j) => (
            <View key={j.id + j.completedAt} style={styles.hist}>
              <MaterialCommunityIcons name={(j.kind === 'pabili' ? 'basket-outline' : CARGO[j.cargo ?? 'parcel'].icon) as any} size={18} color={colors.muted} />
              <Text style={{ flex: 1, marginLeft: 8, color: colors.text }} numberOfLines={1}>{j.dropoff.name}</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>{peso(j.payout)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ActiveJob({ job, onNext, onNavigate, onCancel }: {
  job: DriverJob; onNext: (receipt?: number) => void; onNavigate: () => void; onCancel: () => void;
}) {
  const [receipt, setReceipt] = useState('');
  const toPickup = job.stage === 0;
  const buying = job.kind === 'pabili' && job.stage === 1;
  const receiptValue = Number(receipt.replace(/[^0-9.]/g, ''));

  const next = () => {
    if (!buying) return onNext();
    if (!receiptValue) return Alert.alert('Enter the receipt total', 'Type how much you paid at the store, as shown on the receipt.');
    onNext(receiptValue);
  };

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <MapPreview
        height={200}
        pins={[
          { id: 'p', coord: job.pickup.location, kind: job.kind === 'pabili' ? 'store' : 'pickup' },
          { id: 'd', coord: job.dropoff.location, kind: 'dropoff' },
        ]}
        route={[job.pickup.location, job.dropoff.location]}
      />
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.ride, fontWeight: '800' }}>{STAGE_STATUS[job.kind][job.stage]}</Text>
        <Text style={{ fontWeight: '800', fontSize: 18, marginTop: 4, color: colors.text }}>{job.stage < 2 ? job.pickup.name : job.dropoff.name}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{job.customer} · {job.detail} · earn {peso(job.payout)}</Text>

        {job.items && job.stage < 2 && (
          <View style={styles.list}>
            <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 4 }}>Shopping list</Text>
            {job.items.map((i) => <Text key={i} style={{ color: colors.text, paddingVertical: 2 }}>•  {i}</Text>)}
          </View>
        )}

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

        {job.kind === 'pabili' && job.stage === 2 && job.receipt != null && (
          <View style={styles.collect}>
            <Text style={{ color: colors.text }}>Collect from customer</Text>
            <Text style={{ fontWeight: '800', fontSize: 22, color: colors.text, marginTop: 2 }}>{peso(job.receipt + job.fee)}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{peso(job.receipt)} items (receipt) + {peso(job.fee)} delivery fee</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button title="Navigate" icon="navigation-variant" variant="outline" color={colors.text} style={{ flex: 1 }} onPress={onNavigate} />
          <Button title={STAGES[job.kind][job.stage]} color={colors.ride} style={{ flex: 1.4 }} onPress={next} />
        </View>
        {toPickup && <Button title="Drop job" variant="ghost" color={colors.danger} onPress={onCancel} style={{ marginTop: 6 }} />}
      </View>
    </Card>
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
  status: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  line: { marginTop: 3, color: colors.text },
  list: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, marginTop: 12 },
  receipt: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12 },
  collect: { backgroundColor: colors.rideSoft, borderRadius: radius.md, padding: 12, marginTop: 12 },
  hist: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
});
