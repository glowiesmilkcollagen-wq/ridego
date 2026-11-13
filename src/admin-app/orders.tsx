import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, confirmAction, notify, Page, Panel, Segmented, SmallButton, Table } from '@/components/admin/ui';
import { adminCancelOrder, useAllOrders, useRiders } from '@/lib/adminApi';
import { isOpen, Order, OrderStatus } from '@/lib/api';
import { errorText } from '@/lib/supabase';
import { CARGO, statusText } from '@/lib/trips';
import { colors, peso } from '@/lib/theme';

type Filter = 'open' | 'searching' | 'delivered' | 'cancelled' | 'all';
const TONE: Record<OrderStatus, 'neutral' | 'good' | 'warn' | 'bad' | 'info'> = {
  searching: 'warn', accepted: 'info', at_pickup: 'info', picked_up: 'info', delivered: 'good', cancelled: 'bad',
};

export default function Orders() {
  const [filter, setFilter] = useState<Filter>('open');
  const [days, setDays] = useState(7);
  const orders = useAllOrders(days);
  const riders = useRiders();
  const [openId, setOpenId] = useState<string | null>(null);
  const names = new Map((riders.data ?? []).map((r) => [r.id, `${r.profile?.full_name || 'Rider'} (${r.plate})`]));
  const list = (orders.data ?? []).filter((o) =>
    filter === 'all' ? true : filter === 'open' ? isOpen(o) : o.status === filter);

  const cancel = (o: Order) =>
    confirmAction(`Cancel order ${o.code}?`, 'The customer and rider will see it as cancelled by RideGo.', async () => {
      try {
        await adminCancelOrder(o.id);
        orders.refresh();
      } catch (e) {
        notify('Could not cancel', errorText(e));
      }
    });

  return (
    <Page
      title="Orders"
      subtitle="Updates live. Tap an order code for details."
      actions={<Segmented value={String(days)} onChange={(v) => setDays(Number(v))} options={[{ value: '1', label: 'Today' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} />}
    >
      <Segmented value={filter} onChange={setFilter} options={[
        { value: 'open', label: 'In progress' }, { value: 'searching', label: 'Waiting for rider' }, { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' }, { value: 'all', label: 'All' },
      ]} />
      <Panel>
        <Table
          head={['Order', 'Created', 'Type', 'Customer', 'Route', 'Rider', 'Fee', 'Status', '']}
          widths={[0.8, 1, 0.9, 1, 2.4, 1.4, 0.8, 1.3, 0.8]}
          rows={list.flatMap((o) => {
            const row = [
              <Pressable key="c" onPress={() => setOpenId(openId === o.id ? null : o.id)}><Text style={{ color: colors.ride, fontWeight: '800' }}>{o.code}</Text></Pressable>,
              new Date(o.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
              o.kind === 'pabili' ? 'Pabili' : `Pasugo · ${CARGO[o.cargo ?? 'parcel'].label.split(' ')[0]}`,
              o.customer_name || '—',
              `${o.pickup_name} → ${o.dropoff_name} (${Number(o.km).toFixed(1)} km)`,
              o.rider_id ? names.get(o.rider_id) ?? '—' : '—',
              peso(Number(o.fee)),
              <Badge key="s" text={statusText(o).label} tone={TONE[o.status]} />,
              isOpen(o) ? <SmallButton key="x" title="Cancel" tone="danger" onPress={() => cancel(o)} /> : null,
            ];
            return openId === o.id ? [row, [<Details key="d" o={o} />]] : [row];
          })}
          empty={orders.loaded ? 'No orders match.' : 'Loading…'}
        />
      </Panel>
    </Page>
  );
}

function Details({ o }: { o: Order }) {
  const line = (k: string, v?: string | null) => (v ? <Text style={{ color: colors.text }}><Text style={{ color: colors.muted }}>{k}: </Text>{v}</Text> : null);
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 8, padding: 12, gap: 3 }}>
      {line('Items', o.items?.map((i) => `${i.qty}× ${i.name}`).join(', '))}
      {line('What / who', o.description)}
      {line('Pickup contact', o.sender ? `${o.sender.name} ${o.sender.phone}` : null)}
      {line('Receiver', o.receiver ? `${o.receiver.name} ${o.receiver.phone}` : null)}
      {line('Instructions', o.note)}
      {line('Customer paid', `${peso(Number(o.base_fee))} fee${Number(o.discount) ? ` − ${peso(Number(o.discount))} (${o.promo_code})` : ''}${Number(o.booking_fee) ? ` + ${peso(Number(o.booking_fee))} booking` : ''} = ${peso(Number(o.fee))} · ${o.payment}${o.commission_waived ? ' · beta waiver' : ''}`)}
      {line('Rider earning', `${peso(Number(o.rider_earning))} (${Math.round(Number(o.rider_share) * 100)}%)`)}
      {line('Receipt', o.receipt_amount != null ? peso(Number(o.receipt_amount)) : null)}
      {line('Rating', o.rating ? `${o.rating} ★` : null)}
      {line('Timeline', [['accepted', o.accepted_at], ['at pickup', o.at_pickup_at], ['picked up', o.picked_up_at], ['delivered', o.delivered_at], ['cancelled', o.cancelled_at]]
        .filter(([, t]) => t).map(([k, t]) => `${k} ${new Date(t!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`).join(' · '))}
    </View>
  );
}
