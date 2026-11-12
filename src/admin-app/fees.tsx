import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Field, notify, Page, Panel, SmallButton, Table } from '@/components/admin/ui';
import { loadSettings, saveSettings } from '@/lib/adminApi';
import { deliveryFee, pasugoFee, percent, Prices } from '@/lib/pricing';
import { errorText } from '@/lib/supabase';
import { colors, peso } from '@/lib/theme';

type Form = Record<keyof Prices, string>;
const toForm = (p: Prices): Form => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, k === 'rider_share' ? String(Math.round(v * 100)) : String(v)])) as Form;
const fromForm = (f: Form): Prices => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, k === 'rider_share' ? Number(v) / 100 : Number(v)])) as Prices;

export default function Fees() {
  const [form, setForm] = useState<Form | null>(null);
  const [updated, setUpdated] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadSettings().then(({ updated_at, ...p }) => { setForm(toForm(p)); setUpdated(updated_at); }).catch((e) => notify('Could not load', errorText(e)));
  }, []);
  if (!form) return <Page title="Fees & commission"><Text style={{ color: colors.muted }}>Loading…</Text></Page>;

  const p = fromForm(form);
  const bad = Object.entries(p).some(([k, v]) => !Number.isFinite(v) || v < 0 || (k === 'rider_share' && v > 1));
  const f = (key: keyof Prices, label: string, hint?: string) => (
    <Field label={label} hint={hint} value={form[key]} onChangeText={(v) => setForm({ ...form, [key]: v })} keyboardType="decimal-pad" />
  );
  const save = async () => {
    if (bad) return notify('Check the numbers', 'All values must be numbers ≥ 0, and the rider share between 0 and 100.');
    setSaving(true);
    try {
      await saveSettings(p);
      setUpdated(new Date().toISOString());
      notify('Saved', 'New orders use these prices right away. Orders already placed keep their original fee and share.');
    } catch (e) {
      notify('Could not save', errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="Fees & commission"
      subtitle={`Prices the apps charge customers, and the riders' share. ${updated ? `Last changed ${new Date(updated).toLocaleString()}.` : ''}`}
      actions={<SmallButton title={saving ? 'Saving…' : 'Save changes'} tone="primary" onPress={save} disabled={saving || bad} />}
    >
      <Panel title="Commission">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {f('rider_share', 'Rider share (%)', `Riders keep ${percent(p.rider_share)} of each fee; RideGo keeps ${percent(1 - p.rider_share)}.`)}
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
      <Panel title="Preview">
        <Table
          head={['Distance', 'Pabili', 'Pasugo moto', 'Pasugo car', 'Rider gets (moto)', 'RideGo keeps (moto)']}
          rows={[2, 5, 8, 12].map((km) => {
            const moto = pasugoFee(km, 'moto', p);
            return [`${km} km`, peso(deliveryFee(km, p)), peso(moto), peso(pasugoFee(km, 'car', p)), peso(Math.round(moto * p.rider_share)), peso(moto - Math.round(moto * p.rider_share))];
          })}
        />
      </Panel>
    </Page>
  );
}
