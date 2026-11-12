import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Chip, Empty, Row } from '@/components/ui';
import { DriverJob, jobsSince, summarize } from '@/lib/driver';
import { RIDER_SHARE } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import { CARGO, PAYMENT_LABELS } from '@/lib/trips';
import { colors, peso } from '@/lib/theme';

type Period = 'today' | 'week' | 'all';
const share = `${Math.round(RIDER_SHARE * 100)}%`;

export default function Earnings() {
  const { state } = useStore();
  const [period, setPeriod] = useState<Period>('today');
  const jobs = period === 'all' ? state.driver.history : jobsSince(state.driver.history, period);
  const t = summarize(jobs);

  // Group completed jobs by day, newest first.
  const days = new Map<string, DriverJob[]>();
  for (const j of jobs) {
    const d = new Date(j.completedAt ?? 0).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    days.set(d, [...(days.get(d) ?? []), j]);
  }
  const sections = [...days].map(([title, data]) => ({ title, data, total: summarize(data).earned }));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(j) => `${j.id}-${j.completedAt}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 6 }}>
            <Text style={styles.h1}>Earnings</Text>
            <View style={{ flexDirection: 'row' }}>
              <Chip label="Today" active={period === 'today'} onPress={() => setPeriod('today')} color={colors.ride} />
              <Chip label="This week" active={period === 'week'} onPress={() => setPeriod('week')} color={colors.ride} />
              <Chip label="All time" active={period === 'all'} onPress={() => setPeriod('all')} color={colors.ride} />
            </View>

            <Card style={{ backgroundColor: colors.rideSoft, borderColor: colors.ride }}>
              <Text style={{ color: colors.text }}>You earned</Text>
              <Text style={styles.big}>{peso(t.earned)}</Text>
              <Text style={{ color: colors.muted }}>{t.jobs} job{t.jobs === 1 ? '' : 's'} · your share is {share} of each fee</Text>
            </Card>

            <Card>
              <Row label="Fees charged to customers" value={peso(t.fees)} />
              <Row label={`Your ${share} share`} value={peso(t.earned)} bold />
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
              <Row label="Fees you collected in cash" value={peso(t.cashFees)} />
              <Row label="Cash to remit to RideGo" value={peso(t.toRemit)} bold valueColor={t.toRemit ? colors.warning : undefined} />
              <Text style={styles.note}>
                For cash payments you hold the whole fee: keep your {share} and remit the rest. Fees paid by GCash or card
                are collected by RideGo and your share is paid out to you.
              </Text>
            </Card>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text style={{ fontWeight: '800', color: colors.text }}>{section.title}</Text>
            <Text style={{ fontWeight: '700', color: colors.ride }}>{peso(section.total)}</Text>
          </View>
        )}
        renderItem={({ item: j }) => (
          <View style={styles.job}>
            <MaterialCommunityIcons
              name={(j.kind === 'pabili' ? 'basket-outline' : CARGO[j.cargo ?? 'parcel'].icon) as any}
              size={20} color={j.kind === 'pabili' ? colors.primary : colors.ride}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                {j.kind === 'pabili' ? 'Pabili' : 'Pasugo'} · {j.dropoff.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {new Date(j.completedAt ?? 0).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {j.km.toFixed(1)} km ·
                fee {peso(j.fee)} ({PAYMENT_LABELS[j.payment]})
              </Text>
            </View>
            <Text style={{ fontWeight: '800', color: colors.text }}>{peso(j.payout)}</Text>
          </View>
        )}
        ListEmptyComponent={<Empty icon="wallet-outline" title="No completed jobs" subtitle="Finished jobs and your earnings show up here." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  big: { fontSize: 34, fontWeight: '800', color: colors.text, marginVertical: 2 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 6 },
  job: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
});
