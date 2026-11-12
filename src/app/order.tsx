import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PaymentPicker from '@/components/PaymentPicker';
import { Button, Card, Empty, Row, SectionTitle } from '@/components/ui';
import { CATEGORIES, DEFAULT_ITEM_EXAMPLE, STORES } from '@/lib/data';
import { etaMinutes } from '@/lib/pricing';
import { errandQuote, useStore } from '@/lib/store';
import { colors, peso, radius } from '@/lib/theme';

export default function Order() {
  const { state, addErrandItem, changeErrandQty, placeErrand } = useStore();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [budget, setBudget] = useState('');
  const { store, storeId, items } = state.errand;

  if (!store) {
    return (
      <Empty icon="storefront-outline" title="Choose where to buy" subtitle="Pick a place from the list or any store near you.">
        <Button title="Choose a store" onPress={() => router.replace('/pabili')} style={{ marginTop: 20 }} />
      </Empty>
    );
  }

  const known = storeId ? STORES.find((r) => r.id === storeId) : undefined;
  const suggestions = (known?.favorites ?? []).filter((f) => !items.some((i) => i.name.toLowerCase() === f.toLowerCase()));
  const { km, fee } = errandQuote(store, state.home);
  const eta = (known?.waitMinutes ?? 15) + etaMinutes(km) + 5;
  const example = CATEGORIES.find((c) => c.key === known?.category)?.example ?? DEFAULT_ITEM_EXAMPLE;
  const pharmacy = known?.category === 'Medicine' || /pharma|drug|botika|parmasya/i.test(store.name);
  const budgetValue = Number(budget.replace(/[^0-9.]/g, '')) || undefined;

  const add = () => {
    addErrandItem(draft);
    setDraft('');
  };
  const place = () => {
    const id = placeErrand(note.trim(), budgetValue);
    if (id) router.replace(`/track/${id}`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 34 }}>{known?.emoji ?? '🏪'}</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Buy from</Text>
            <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{store.name}</Text>
            {known ? <Text style={{ color: colors.muted }}>{known.address}</Text> : null}
          </View>
          <Pressable onPress={() => router.back()}><Text style={styles.link}>Change</Text></Pressable>
        </Card>

        <Card>
          <SectionTitle>What should the rider buy?</SectionTitle>
          <View style={styles.addRow}>
            <TextInput
              value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done" blurOnSubmit={false}
              placeholder={example} placeholderTextColor={colors.muted} style={styles.addInput}
            />
            <Pressable accessibilityLabel="Add item" onPress={add} style={[styles.addBtn, !draft.trim() && { opacity: 0.4 }]} disabled={!draft.trim()}>
              <MaterialCommunityIcons name="plus" size={22} color="#fff" />
            </Pressable>
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggest}>
              {suggestions.map((f) => (
                <Pressable key={f} onPress={() => addErrandItem(f)} style={styles.sugChip}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>+ {f}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {pharmacy && (
            <View style={[styles.info, { backgroundColor: '#E0F2FE', marginTop: 12 }]}>
              <MaterialCommunityIcons name="prescription" size={20} color={colors.text} />
              <Text style={{ flex: 1, marginLeft: 8, color: colors.text, lineHeight: 19 }}>
                Prescription medicines (e.g. antibiotics) can only be sold with a valid prescription. Write the exact name and
                strength, and say in the instructions how the rider can get your prescription.
              </Text>
            </View>
          )}

          {items.length === 0 ? (
            <Text style={{ color: colors.muted, marginTop: 12 }}>Your list is empty. Type an item above and tap +.</Text>
          ) : (
            items.map((i) => (
              <View key={i.id} style={styles.line}>
                <View style={styles.stepper}>
                  <Pressable onPress={() => changeErrandQty(i.id, -1)} hitSlop={8}>
                    <MaterialCommunityIcons name={i.qty === 1 ? 'trash-can-outline' : 'minus'} size={18} color={colors.primary} />
                  </Pressable>
                  <Text style={{ fontWeight: '800', marginHorizontal: 10 }}>{i.qty}</Text>
                  <Pressable onPress={() => changeErrandQty(i.id, 1)} hitSlop={8}>
                    <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                  </Pressable>
                </View>
                <Text style={{ flex: 1, marginLeft: 12, color: colors.text }}>{i.name}</Text>
              </View>
            ))
          )}
        </Card>

        <Card>
          <SectionTitle>Instructions for the rider</SectionTitle>
          <TextInput
            value={note} onChangeText={setNote} multiline placeholderTextColor={colors.muted} style={styles.note}
            placeholder={pharmacy ? "e.g. Generic brand is OK. Pick up my prescription from the guard first." : "e.g. If sold out, get a similar item. Ask for the receipt."}
          />
          <Text style={styles.label}>Maximum the rider may spend on items (optional)</Text>
          <View style={styles.budget}>
            <Text style={{ fontWeight: '700', color: colors.text }}>₱</Text>
            <TextInput
              value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="No limit"
              placeholderTextColor={colors.muted} style={{ flex: 1, marginLeft: 6, paddingVertical: 10, fontSize: 16, color: colors.text }}
            />
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="map-marker" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Deliver to</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>{state.home.name}</Text>
            </View>
            <Pressable onPress={() => router.push('/place-search?target=home')}><Text style={styles.link}>Change</Text></Pressable>
          </View>
          <Text style={{ color: colors.muted, marginTop: 10 }}>Estimated arrival: about {eta}–{eta + 15} min</Text>
        </Card>

        <Card>
          <SectionTitle>Pay the delivery fee with</SectionTitle>
          <PaymentPicker />
        </Card>

        <Card>
          <Row label={`Delivery fee (${km.toFixed(1)} km)`} value={peso(fee)} bold />
          <Row label="Items" value="Pay rider as per receipt" />
          {budgetValue ? <Row label="Item spending limit" value={peso(budgetValue)} /> : null}
          <View style={styles.info}>
            <MaterialCommunityIcons name="receipt-text-outline" size={20} color={colors.text} />
            <Text style={{ flex: 1, marginLeft: 8, color: colors.text, lineHeight: 19 }}>
              The rider pays for your items at the store and shows you the receipt. Prepare cash for the items when they arrive.
            </Text>
          </View>
        </Card>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Button title={items.length ? `Find a rider · ${peso(fee)} delivery` : 'Add at least one item'} onPress={place} disabled={!items.length} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '700' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text },
  addBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  suggest: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  sugChip: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primarySoft },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  note: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 60, color: colors.text, textAlignVertical: 'top' },
  label: { color: colors.muted, marginTop: 14, marginBottom: 6 },
  budget: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12 },
  info: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, marginTop: 10 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
