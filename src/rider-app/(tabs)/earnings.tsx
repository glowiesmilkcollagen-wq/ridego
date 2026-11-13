import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Chip, Empty, Row } from '@/components/ui';
import { Order, useRiderMoney, useRiderOrders } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { deliveredSince, summarize } from '@/lib/driver';
import { percent } from '@/lib/pricing';
import { CARGO, PAYMENT_LABELS } from '@/lib/trips';
import { colors, peso } from '@/lib/theme';

type Period = 'today' | 'week' | 'all';

export default function Earnings() {
  const { userId } = useAuth();
  const orders = useRiderOrders(userId);
  const money = useRiderMoney(userId);
  const [period, setPeriod] = useState<Period>('today');
  const jobs = deliveredSince(orders.data ?? [], period);
  const t = summarize(jobs);
  const shares = [...new Set(jobs.map((j) => Number(j.rider_share)))];
  const share = shares.length === 1 ? percent(shares[0]) : 'your share';
  const balance = money.data?.balance ?? 0;

  const days = new Map<string, Order[]>();
  for (const j of jobs) {
    const d = new Date(j.delivered_at!).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    days.set(d, [...(days.get(d) ?? []), j]);
  }
  const sections = [...days].map(([title, data]) => ({ title, data, total: summarize(data).earned }));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(j) => j.id}
        stickySectionHeadersEnabled={false}
        refreshing={false}
        onRefresh={() => { orders.refresh(); money.refresh(); }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 6 }}>
            <Text style={styles.h1}>Earnings</Text>

            <Card style={balance > 0 ? { backgroundColor: '#FFF7E6', borderColor: colors.warning } : undefined}>
              <Text style={{ color: colors.text }}>{balance > 0 ? 'You owe RideGo' : balance < 0 ? 'RideGo owes you' : 'You are settled with RideGo'}</Text>
              <Text style={[styles.big, { fontSize: 26 }]}>{peso(Math.abs(balance))}</Text>
              <Text style={styles.note}>
                {balance > 0 ? 'The company’s share of cash fees you collected. Remit it to RideGo; the admin records it here.'
                  : balance < 0 ? 'Your share of fees RideGo collected (or promo discounts). RideGo pays it out to you.' : 'All cash and payouts are recorded.'}
              </Text>
            </Card>

            <View style={{ flexDirection: 'row' }}>
              <Chip label="Today" active={period === 'today'} onPress={() => setPeriod('today')} color={colors.ride} />
              <Chip label="This week" active={period === 'week'} onPress={() => setPeriod('week')} color={colors.ride} />
              <Chip label="All time" active={period === 'all'} onPress={() => setPeriod('all')} color={colors.ride} />
            </View>

            <Card style={{ backgroundColor: colors.rideSoft, borderColor: colors.ride }}>
              <Text style={{ color: colors.text }}>You earned</Text>
              <Text style={styles.big}>{peso(t.earned)}</Text>
              <Text style={{ color: colors.muted }}>{t.jobs} job{t.jobs === 1 ? '' : 's'} · you keep {share} of each fee</Text>
            </Card>

            <Card>
              <Row label="Fees charged to customers" value={peso(t.fees)} />
              <Row label={`Your share`} value={peso(t.earned)} bold />
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
              <Row label="Fees you collected in cash" value={peso(t.cashFees)} />
              <Row label="Company share of that cash" value={peso(t.toRemit)} bold valueColor={t.toRemit ? colors.warning : undefined} />
            </Card>

            {(money.data?.transactions ?? []).length > 0 && (
              <Card>
                <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 6 }}>Remittances & payouts</Text>
                {money.data!.transactions.slice(0, 5).map((tx) => (
                  <Row key={tx.id} label={`${new Date(tx.created_at).toLocaleDateString()} · ${tx.type === 'remittance' ? 'You remitted' : 'Paid to you'}${tx.note ? ` · ${tx.note}` : ''}`} value={peso(Number(tx.amount))} />
                ))}
              </Card>
            )}
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
              <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{j.kind === 'pabili' ? 'Pabili' : 'Pasugo'} · {j.dropoff_name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {new Date(j.delivered_at!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {Number(j.km).toFixed(1)} km · fee {peso(Number(j.fee))} ({PAYMENT_LABELS[j.payment]})
              </Text>
            </View>
            <Text style={{ fontWeight: '800', color: colors.text }}>{peso(Number(j.rider_earning))}</Text>
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
  note: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 6 },
  job: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
});
