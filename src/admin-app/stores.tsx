import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, confirmAction, Field, notify, Page, Panel, Segmented, SmallButton, Table } from '@/components/admin/ui';
import { deleteStore, saveStore, StoreInput, useAllStores } from '@/lib/adminApi';
import { StoreRow } from '@/lib/api';
import { CATEGORIES, Category } from '@/lib/data';
import { errorText } from '@/lib/supabase';
import { colors } from '@/lib/theme';

const EMPTY: StoreInput = {
  name: '', tagline: '', category: 'Food', emoji: '🏪', tint: '#F7F7F8', rating: 4.5, wait_minutes: 15,
  lat: 14.5547, lng: 121.0244, address: '', favorites: [], active: true,
};

export default function Stores() {
  const stores = useAllStores();
  const [editing, setEditing] = useState<{ id: string | null; s: StoreInput; coords: string; favs: string } | null>(null);

  const open = (row?: StoreRow) => {
    const s: StoreInput = row ? { ...row, rating: Number(row.rating) } : EMPTY;
    setEditing({ id: row?.id ?? null, s, coords: `${s.lat}, ${s.lng}`, favs: s.favorites.join('\n') });
  };
  const set = (patch: Partial<StoreInput>) => editing && setEditing({ ...editing, s: { ...editing.s, ...patch } });

  const save = async () => {
    if (!editing) return;
    const [lat, lng] = editing.coords.split(',').map((x) => Number(x.trim()));
    if (!editing.s.name.trim()) return notify('Name required', 'Enter the store name.');
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return notify('Check the location', 'Paste coordinates like “14.5547, 121.0244”. In Google Maps, right-click the place and click the numbers to copy them.');
    }
    try {
      await saveStore(editing.id, {
        ...editing.s, name: editing.s.name.trim(), lat, lng,
        favorites: editing.favs.split('\n').map((f) => f.trim()).filter(Boolean),
      });
      setEditing(null);
      stores.refresh();
    } catch (e) {
      notify('Could not save', errorText(e));
    }
  };
  const remove = (row: StoreRow) =>
    confirmAction(`Delete ${row.name}?`, 'Past orders keep their details. To hide it temporarily, untick “Shown in app” instead.', async () => {
      try {
        await deleteStore(row.id);
        stores.refresh();
      } catch (e) {
        notify('Could not delete', `${errorText(e)}\n\nStores with past orders can't be deleted — hide them instead.`);
      }
    });

  return (
    <Page
      title="Stores"
      subtitle="Suggested places customers can buy from with Pabili. Customers can still choose any other store."
      actions={<SmallButton title="+ Add store" tone="primary" onPress={() => open()} />}
    >
      {editing && (
        <Panel title={editing.id ? `Edit ${editing.s.name}` : 'New store'}>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Name" value={editing.s.name} onChangeText={(name) => set({ name })} />
              <Field label="Short description" value={editing.s.tagline} onChangeText={(tagline) => set({ tagline })} placeholder="e.g. Pharmacy · Open 24 hours" />
              <Field label="Emoji" value={editing.s.emoji} onChangeText={(emoji) => set({ emoji })} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ fontWeight: '600', color: colors.text, fontSize: 13 }}>Type</Text>
              <Segmented value={editing.s.category} onChange={(category: Category) => set({ category })} options={CATEGORIES.map((c) => ({ value: c.key, label: `${c.emoji} ${c.key}` }))} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Address" value={editing.s.address} onChangeText={(address) => set({ address })} />
              <Field label="Location (latitude, longitude)" value={editing.coords} onChangeText={(coords) => setEditing({ ...editing, coords })} hint="In Google Maps, right-click the place and copy the numbers." />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Typical wait at counter (min)" value={String(editing.s.wait_minutes)} onChangeText={(v) => set({ wait_minutes: Number(v) || 0 })} keyboardType="number-pad" />
              <Field label="Rating (shown to customers)" value={String(editing.s.rating)} onChangeText={(v) => set({ rating: Math.min(5, Number(v) || 0) })} keyboardType="decimal-pad" />
              <Field label="Card colour" value={editing.s.tint} onChangeText={(tint) => set({ tint })} hint="e.g. #FFE8D6" />
            </View>
            <Field label="Quick-add suggestions (one per line)" value={editing.favs} onChangeText={(favs) => setEditing({ ...editing, favs })} multiline />
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <SmallButton title={editing.s.active ? '☑ Shown in app' : '☐ Hidden from app'} onPress={() => set({ active: !editing.s.active })} />
              <View style={{ flex: 1 }} />
              <SmallButton title="Cancel" onPress={() => setEditing(null)} />
              <SmallButton title="Save" tone="primary" onPress={save} />
            </View>
          </View>
        </Panel>
      )}

      <Panel>
        <Table
          head={['Store', 'Type', 'Address', 'Suggestions', 'Status', '']}
          widths={[2, 1, 1.8, 1, 0.9, 1.4]}
          rows={(stores.data ?? []).map((s) => [
            `${s.emoji} ${s.name}`, s.category, s.address || '—', String(s.favorites.length),
            <Badge key="b" text={s.active ? 'Shown' : 'Hidden'} tone={s.active ? 'good' : 'neutral'} />,
            <View key="a" style={{ flexDirection: 'row', gap: 6 }}>
              <SmallButton title="Edit" onPress={() => open(s)} />
              <SmallButton title="Delete" tone="danger" onPress={() => remove(s)} />
            </View>,
          ])}
          empty={stores.loaded ? 'No stores yet. Add one, or run supabase/seed.sql.' : 'Loading…'}
        />
      </Panel>
    </Page>
  );
}
