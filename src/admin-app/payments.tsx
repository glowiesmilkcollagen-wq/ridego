import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Field, notify, Page, Panel, Segmented, SmallButton, StatCard, Table } from '@/components/admin/ui';
import { recordTransaction, useRiderMoneyAll, useRiders } from '@/lib/adminApi';
import { errorText } from '@/lib/supabase';
import { colors, peso } from '@/lib/theme';

export default function Payments() {
  const riders = useRiders();
  const ids = useMemo(() => (riders.data ?? []).filter((r) => r.status !== 'pending').map((r) => r.id), [riders.data]);
  const money = useRiderMoneyAll(ids);
  const [selected, setSelected] = useState<string | null>(null);
  const [type, setType] = useState<'remittance' | 'payout'>('remittance');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const name = (id: string) => {
    const r = riders.data?.find((x) => x.id === id);
    return r ? `${r.profile?.full_name || 'Rider'} (${r.plate})` : id.slice(0, 8);
  };
  const balances = money.data?.balances ?? {};
  const owedToCompany = Object.values(balances).filter((b) => b > 0).reduce((s, b) => s + b, 0);
  const owedToRiders = -Object.values(balances).filter((b) => b < 0).reduce((s, b) => s + b, 0);

  const pick = (id: string) => {
    setSelected(id);
    const b = balances[id] ?? 0;
    setType(b >= 0 ? 'remittance' : 'payout');
    setAmount(b ? String(Math.abs(b)) : '');
    setNote('');
  };
  const save = async () => {
    const value = Number(amount);
    if (!selected || !(value > 0)) return notify('Check the amount', 'Enter an amount greater than zero.');
    setSaving(true);
    try {
      await recordTransaction(selected, type, value, note.trim());
      setSelected(null);
      money.refresh();
    } catch (e) {
      notify('Could not save', errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Payments" subtitle="Customers pay cash for now: riders collect the fee, keep their share, and remit the rest. Record what you receive or pay out here.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Riders owe RideGo" value={peso(owedToCompany)} tone={owedToCompany ? 'warn' : undefined} hint="Company share of cash fees not yet remitted" />
        <StatCard label="RideGo owes riders" value={peso(owedToRiders)} hint="Rider share of promos or non-cash fees" />
      </View>

      {selected && (
        <Panel title={`Record for ${name(selected)}`}>
          <View style={{ gap: 12 }}>
            <Segmented value={type} onChange={setType} options={[{ value: 'remittance', label: 'Rider paid RideGo (remittance)' }, { value: 'payout', label: 'RideGo paid rider (payout)' }]} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Amount (₱)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              <Field label="Note" value={note} onChangeText={setNote} placeholder="e.g. GCash ref 1234, cash at office" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SmallButton title={saving ? 'Saving…' : 'Save'} tone="primary" onPress={save} disabled={saving} />
              <SmallButton title="Cancel" onPress={() => setSelected(null)} />
            </View>
          </View>
        </Panel>
      )}

      <Panel title="Balances">
        <Table
          head={['Rider', 'Balance', '']}
          widths={[2, 2, 1]}
          rows={ids.map((id) => {
            const b = balances[id] ?? 0;
            return [
              name(id),
              <Text key="b" style={{ fontWeight: '700', color: b > 0 ? '#9A6700' : b < 0 ? colors.ride : colors.muted }}>
                {b > 0 ? `Owes RideGo ${peso(b)}` : b < 0 ? `RideGo owes ${peso(-b)}` : 'Settled'}
              </Text>,
              <SmallButton key="r" title="Record" onPress={() => pick(id)} />,
            ];
          })}
          empty={money.loaded || !ids.length ? 'No approved riders yet.' : 'Loading…'}
        />
      </Panel>

      <Panel title="History">
        <Table
          head={['Date', 'Rider', 'Type', 'Amount', 'Note']}
          widths={[1.2, 2, 1.2, 1, 2]}
          rows={(money.data?.transactions ?? []).map((t) => [
            new Date(t.created_at).toLocaleString(), name(t.rider_id), t.type === 'remittance' ? 'Remittance' : 'Payout', peso(Number(t.amount)), t.note || '—',
          ])}
          empty="Nothing recorded yet."
        />
      </Panel>
    </Page>
  );
}
