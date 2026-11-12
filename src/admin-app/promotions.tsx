import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, confirmAction, Field, notify, Page, Panel, Segmented, SmallButton, Table } from '@/components/admin/ui';
import { deletePromotion, PromoInput, savePromotion, usePromotions } from '@/lib/adminApi';
import { Promotion } from '@/lib/api';
import { errorText } from '@/lib/supabase';
import { peso } from '@/lib/theme';

type Form = { code: string; description: string; discount_type: 'percent' | 'fixed'; value: string; max_discount: string; applies_to: PromoInput['applies_to']; once: boolean; max_uses: string; ends: string };
const EMPTY: Form = { code: '', description: '', discount_type: 'percent', value: '20', max_discount: '50', applies_to: 'all', once: true, max_uses: '', ends: '' };

const describe = (p: Promotion) =>
  `${p.discount_type === 'percent' ? `${Number(p.value)}% off` : `${peso(Number(p.value))} off`}${p.max_discount ? ` (max ${peso(Number(p.max_discount))})` : ''}`;
const status = (p: Promotion) =>
  !p.active ? ['Paused', 'neutral'] : p.ends_at && new Date(p.ends_at) < new Date() ? ['Ended', 'bad'] : ['Active', 'good'];

export default function Promotions() {
  const promos = usePromotions();
  const [form, setForm] = useState<Form | null>(null);
  const set = (patch: Partial<Form>) => form && setForm({ ...form, ...patch });

  const create = async () => {
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    const ends = form.ends.trim() ? new Date(`${form.ends.trim()}T23:59:59`) : null;
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return notify('Check the code', 'Use 3–20 letters or numbers, no spaces.');
    if (!(Number(form.value) > 0)) return notify('Check the discount', 'Enter a discount greater than zero.');
    if (ends && isNaN(ends.getTime())) return notify('Check the end date', 'Use the format YYYY-MM-DD, e.g. 2026-12-31.');
    try {
      await savePromotion(null, {
        code, description: form.description.trim(), discount_type: form.discount_type, value: Number(form.value),
        max_discount: form.max_discount.trim() ? Number(form.max_discount) : null, applies_to: form.applies_to,
        once_per_customer: form.once, max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
        starts_at: null, ends_at: ends?.toISOString() ?? null, active: true,
      });
      setForm(null);
      promos.refresh();
    } catch (e) {
      notify('Could not create', /duplicate/i.test(errorText(e)) ? 'That code already exists.' : errorText(e));
    }
  };
  const toggle = async (p: Promotion) => {
    try {
      const { id, created_at, ...rest } = p;
      await savePromotion(id, { ...rest, active: !p.active });
      promos.refresh();
    } catch (e) {
      notify('Could not update', errorText(e));
    }
  };

  return (
    <Page
      title="Promotions"
      subtitle="Promo codes customers type at checkout. Discounts come out of RideGo's commission — riders still earn their share of the full fee."
      actions={<SmallButton title="+ New promo code" tone="primary" onPress={() => setForm(EMPTY)} />}
    >
      {form && (
        <Panel title="New promo code">
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Code" value={form.code} onChangeText={(code) => set({ code: code.toUpperCase() })} autoCapitalize="characters" placeholder="WELCOME20" />
              <Field label="Description (shown to customers)" value={form.description} onChangeText={(description) => set({ description })} placeholder="20% off your first order" />
            </View>
            <Segmented value={form.discount_type} onChange={(discount_type) => set({ discount_type })} options={[{ value: 'percent', label: 'Percent off' }, { value: 'fixed', label: 'Fixed ₱ off' }]} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Field label={form.discount_type === 'percent' ? 'Discount (%)' : 'Discount (₱)'} value={form.value} onChangeText={(value) => set({ value })} keyboardType="decimal-pad" />
              {form.discount_type === 'percent' && <Field label="Max discount (₱, optional)" value={form.max_discount} onChangeText={(max_discount) => set({ max_discount })} keyboardType="decimal-pad" />}
              <Field label="Total uses allowed (optional)" value={form.max_uses} onChangeText={(max_uses) => set({ max_uses })} keyboardType="number-pad" />
              <Field label="Ends on (YYYY-MM-DD, optional)" value={form.ends} onChangeText={(ends) => set({ ends })} placeholder="2026-12-31" />
            </View>
            <Segmented value={form.applies_to} onChange={(applies_to) => set({ applies_to })} options={[{ value: 'all', label: 'Pabili & Pasugo' }, { value: 'pabili', label: 'Pabili only' }, { value: 'pasugo', label: 'Pasugo only' }]} />
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <SmallButton title={form.once ? '☑ Once per customer' : '☐ Once per customer'} onPress={() => set({ once: !form.once })} />
              <View style={{ flex: 1 }} />
              <SmallButton title="Cancel" onPress={() => setForm(null)} />
              <SmallButton title="Create" tone="primary" onPress={create} />
            </View>
          </View>
        </Panel>
      )}
      <Panel>
        <Table
          head={['Code', 'Discount', 'For', 'Limits', 'Ends', 'Status', '']}
          widths={[1.1, 1.6, 1, 1.4, 1, 0.9, 1.6]}
          rows={(promos.data ?? []).map((p) => {
            const [label, tone] = status(p);
            return [
              p.code, describe(p), p.applies_to === 'all' ? 'All' : p.applies_to === 'pabili' ? 'Pabili' : 'Pasugo',
              [p.once_per_customer ? 'once each' : '', p.max_uses ? `${p.max_uses} total` : ''].filter(Boolean).join(', ') || '—',
              p.ends_at ? new Date(p.ends_at).toLocaleDateString() : '—',
              <Badge key="s" text={label} tone={tone as 'good'} />,
              <View key="a" style={{ flexDirection: 'row', gap: 6 }}>
                <SmallButton title={p.active ? 'Pause' : 'Resume'} onPress={() => toggle(p)} />
                <SmallButton title="Delete" tone="danger" onPress={() => confirmAction(`Delete ${p.code}?`, 'Orders that used it keep their discount.', async () => {
                  try { await deletePromotion(p.id); promos.refresh(); } catch (e) { notify('Could not delete', errorText(e)); }
                })} />
              </View>,
            ];
          })}
          empty={promos.loaded ? 'No promo codes yet.' : 'Loading…'}
        />
      </Panel>
    </Page>
  );
}
