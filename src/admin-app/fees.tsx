import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Field, notify, Page, Panel, SmallButton, Table } from '@/components/admin/ui';
import { loadSettings, saveSettings } from '@/lib/adminApi';
import { currentBookingFee, currentShare, deliveryFee, pasugoFee, percent, Prices } from '@/lib/pricing';
import { errorText } from '@/lib/supabase';
import { colors, peso, radius } from '@/lib/theme';

type NumKey = Exclude<keyof Prices, 'beta_waiver'>;
type Form = Record<NumKey, string> & { beta_waiver: boolean };
const toForm = (p: Prices): Form => {
  const f = { beta_waiver: p.beta_waiver } as Form;
  for (const [k, v] of Object.entries(p)) if (k !== 'beta_waiver') f[k as NumKey] = k === 'rider_share' ? String(Math.round(Number(v) * 100)) : String(v);
  return f;
};
const fromForm = (f: Form): Prices => {
  const p = { beta_waiver: f.beta_waiver } as Prices;
  for (const [k, v] of Object.entries(f)) if (k !== 'beta_waiver') (p as Record<string, unknown>)[k] = k === 'rider_share' ? Number(v) / 100 : Number(v);
  return p;
};

export default function Fees() {
  const [form, setForm] = useState<Form | null>(null);
  const [updated, setUpdated] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadSettings().then(({ updated_at, ...p }) => { setForm(toForm(p)); setUpdated(updated_at); }).catch((e) => notify('Could not load', errorText(e)));
  }, []);
  if (!form) return <Page title="Fees & commission"><Text style={{ color: colors.muted }}>Loading…</Text></Page>;

  const p = fromForm(form);
  const bad = Object.entries(p).some(([k, v]) => k !== 'beta_waiver' && (!Number.isFinite(v as number) || (v as number) < 0 || (k === 'rider_share' && (v as number) > 1)));
  const share = currentShare(p);
  const booking = currentBookingFee(p);
  const f = (key: NumKey, label: string, hint?: string) => (
    <Field label={label} hint={hint} value={form[key]} onChangeText={(v) => setForm({ ...form, [key]: v })} keyboardType="decimal-pad" />
  );
  const save = async () => {
    if (bad) return notify('Check the numbers', 'All values must be numbers ≥ 0, and the rider share between 0 and 100.');
    setSaving(true);
    try {
      await saveSettings(p);
      setUpdated(new Date().toISOString());
      notify('Saved', 'New orders use these settings right away. Orders already placed keep their original fees and share.');
    } catch (e) {
      notify('Could not save', errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="Fees & commission"
      subtitle={`What customers pay, and how it is split with riders. ${updated ? `Last changed ${new Date(updated).toLocaleString()}.` : ''}`}
      actions={<SmallButton title={saving ? 'Saving…' : 'Save changes'} tone="primary" onPress={save} disabled={saving || bad} />}
    >
      <Panel title="Beta waiver">
        <Pressable onPress={() => setForm({ ...form, beta_waiver: !form.beta_waiver })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: form.beta_waiver ? colors.ride : colors.border, alignItems: form.beta_waiver ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: colors.text }}>{form.beta_waiver ? 'ON — no booking fee, no commission' : 'OFF — normal fees and commission'}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>
              {form.beta_waiver
                ? `Customers pay only the delivery/pasugo fee, and riders keep 100% of it. Turn this off to start charging the ₱${p.booking_fee} booking fee and keeping ${percent(1 - p.rider_share)} commission.`
                : `Customers pay the fee plus a ₱${p.booking_fee} booking fee; riders keep ${percent(p.rider_share)} of the fee and RideGo keeps ${percent(1 - p.rider_share)} plus the booking fee.`}
            </Text>
          </View>
        </Pressable>
      </Panel>

      <Panel title="Commission and booking fee (apply when the beta waiver is off)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {f('rider_share', 'Rider share (%)', `Riders keep ${percent(p.rider_share)} of each fee; RideGo keeps ${percent(1 - p.rider_share)}.`)}
          {f('booking_fee', 'Booking fee (₱)', 'Added to every order; goes to RideGo.')}
        </View>
      </Panel>
      <Panel title="Pabili delivery fee">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {f('pabili_base', 'Base fee (₱)')}
          {f('pabili_base_km', 'Km included in base')}
          {f('pabili_per_km', 'Per extra km (₱)')}
        </View>
      </Panel>
      <Panel title="Pasugo — motorcycle">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {f('moto_base', 'Base (₱)')}{f('moto_per_km', 'Per km (₱)')}{f('moto_per_min', 'Per minute (₱)', 'Estimated at 24 km/h')}{f('moto_min', 'Minimum (₱)')}
        </View>
      </Panel>
      <Panel title="Pasugo — car">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {f('car_base', 'Base (₱)')}{f('car_per_km', 'Per km (₱)')}{f('car_per_min', 'Per minute (₱)', 'Estimated at 16 km/h')}{f('car_min', 'Minimum (₱)')}
        </View>
      </Panel>
      <Panel title={`Preview — pasugo by motorcycle, ${form.beta_waiver ? 'beta waiver ON' : 'beta waiver OFF'}`}>
        <Table
          head={['Distance', 'Fee', 'Booking fee', 'Customer pays', 'Rider gets', 'RideGo keeps']}
          rows={[2, 5, 8, 12].map((km) => {
            const fee = pasugoFee(km, 'moto', p);
            const rider = Math.round(fee * share);
            return [`${km} km`, peso(fee), peso(booking), peso(fee + booking), peso(rider), peso(fee + booking - rider)];
          })}
        />
        <Text style={{ color: colors.muted, marginTop: 8, fontSize: 12 }}>Pabili at the same distances: {[2, 5, 8, 12].map((km) => peso(deliveryFee(km, p))).join(' · ')} (before booking fee). Promo discounts come out of RideGo’s part.</Text>
      </Panel>
      <View style={{ height: 1, borderRadius: radius.sm }} />
    </Page>
  );
}
