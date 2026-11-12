import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Panel, Segmented, StatCard, Table } from '@/components/admin/ui';
import { useAllOrders, useRiders } from '@/lib/adminApi';
import { isOpen, Order } from '@/lib/api';
import { colors, peso } from '@/lib/theme';

type Range = '1' | '7' | '30' | '90';
const n = (v: unknown) => Number(v ?? 0);
const dayKey = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });

function totals(orders: Order[]) {
  const done = orders.filter((o) => o.status === 'delivered');
  const fees = done.reduce((s, o) => s + n(o.fee), 0);
  const riders = done.reduce((s, o) => s + n(o.rider_earning), 0);
  return {
    orders: orders.length, delivered: done.length, cancelled: orders.filter((o) => o.status === 'cancelled').length,
    fees, riders, commission: fees - riders, discounts: done.reduce((s, o) => s + n(o.discount), 0),
    pabili: done.filter((o) => o.kind === 'pabili').length, pasugo: done.filter((o) => o.kind === 'pasugo').length,
  };
}

export default function Overview() {
  const [range, setRange] = useState<Range>('7');
  const orders = useAllOrders(Number(range));
  const riders = useRiders();
  const all = orders.data ?? [];
  const t = totals(all);
  const open = all.filter(isOpen);
  const online = (riders.data ?? []).filter((r) => r.online && r.status === 'approved').length;
  const pending = (riders.data ?? []).filter((r) => r.status === 'pending').length;

  const byDay = new Map<string, Order[]>();
  for (const o of all) byDay.set(dayKey(o.created_at), [...(byDay.get(dayKey(o.created_at)) ?? []), o]);
  const names = new Map((riders.data ?? []).map((r) => [r.id, r.profile?.full_name || r.plate]));
  const byRider = new Map<string, Order[]>();
  for (const o of all.filter((x) => x.status === 'delivered' && x.rider_id)) byRider.set(o.rider_id!, [...(byRider.get(o.rider_id!) ?? []), o]);
  const topRiders = [...byRider].map(([id, os]) => ({ id, ...totals(os) })).sort((a, b) => b.delivered - a.delivered).slice(0, 10);

  return (
    <Page
      title="Overview"
      subtitle="Delivered orders count toward fees. Commission = fees customers paid − rider earnings (promos come out of commission)."
      actions={<Segmented value={range} onChange={setRange} options={[{ value: '1', label: 'Today' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Live orders now" value={String(open.length)} hint={`${open.filter((o) => o.status === 'searching').length} waiting for a rider`} />
        <StatCard label="Riders online" value={String(online)} hint={pending ? `${pending} application${pending > 1 ? 's' : ''} to review` : 'No applications waiting'} tone={pending ? 'warn' : undefined} />
        <StatCard label="Delivered" value={String(t.delivered)} hint={`${t.pabili} pabili · ${t.pasugo} pasugo`} />
        <StatCard label="Cancelled" value={String(t.cancelled)} hint={t.orders ? `${Math.round((t.cancelled / t.orders) * 100)}% of orders` : undefined} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Fees paid by customers" value={peso(t.fees)} />
        <StatCard label="Rider earnings" value={peso(t.riders)} />
        <StatCard label="Company commission" value={peso(t.commission)} tone="good" />
        <StatCard label="Promo discounts given" value={peso(t.discounts)} />
      </View>

      <Panel title="By day">
        <Table
          head={['Day', 'Orders', 'Delivered', 'Cancelled', 'Fees', 'Rider earnings', 'Commission']}
          widths={[2, 1, 1, 1, 1, 1.2, 1.2]}
          rows={[...byDay].map(([day, os]) => {
            const d = totals(os);
            return [day, String(d.orders), String(d.delivered), String(d.cancelled), peso(d.fees), peso(d.riders), peso(d.commission)];
          })}
          empty={orders.loaded ? 'No orders in this period.' : 'Loading…'}
        />
      </Panel>

      <Panel title="Top riders">
        <Table
          head={['Rider', 'Jobs', 'Fees', 'Earned', 'Commission']}
          widths={[2, 1, 1, 1, 1]}
          rows={topRiders.map((r) => [names.get(r.id) ?? r.id.slice(0, 8), String(r.delivered), peso(r.fees), peso(r.riders), peso(r.commission)])}
          empty="No deliveries in this period."
        />
      </Panel>
      {orders.error ? <Text style={{ color: colors.danger }}>Could not load orders: {String((orders.error as Error).message ?? orders.error)}</Text> : null}
    </Page>
  );
}
