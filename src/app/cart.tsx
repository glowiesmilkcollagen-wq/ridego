import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PaymentPicker from '@/components/PaymentPicker';
import { Button, Card, Empty, Row, SectionTitle } from '@/components/ui';
import { etaMinutes } from '@/lib/pricing';
import { cartTotals, useStore } from '@/lib/store';
import { colors, peso } from '@/lib/theme';

export default function Cart() {
  const { state, changeQty, placeFoodOrder } = useStore();
  const [note, setNote] = useState('');
  const insets = useSafeAreaInsets();
  const t = cartTotals(state.cart, state.home);

  if (!t.restaurant || !t.count) {
    return (
      <Empty icon="cart-outline" title="Your cart is empty" subtitle="Add something tasty from a restaurant">
        <Button title="Browse restaurants" onPress={() => router.replace('/food')} style={{ marginTop: 20 }} />
      </Empty>
    );
  }
  const eta = t.restaurant.prepMinutes + etaMinutes(t.km);

  const place = () => {
    const id = placeFoodOrder(note.trim());
    if (id) router.replace(`/track/${id}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="map-marker" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Delivery address</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>{state.home.name}</Text>
            </View>
            <Pressable onPress={() => router.push('/place-search?target=home')}><Text style={styles.link}>Change</Text></Pressable>
          </View>
          <Text style={{ color: colors.muted, marginTop: 10 }}>Estimated delivery: {eta}–{eta + 10} min</Text>
        </Card>

        <Card>
          <SectionTitle>{t.restaurant.name}</SectionTitle>
          {state.cart.lines.map((l) => (
            <View key={l.itemId} style={styles.line}>
              <View style={styles.stepper}>
                <Pressable onPress={() => changeQty(l.itemId, -1)} hitSlop={8}><MaterialCommunityIcons name={l.qty === 1 ? 'trash-can-outline' : 'minus'} size={18} color={colors.primary} /></Pressable>
                <Text style={{ fontWeight: '800', marginHorizontal: 10 }}>{l.qty}</Text>
                <Pressable onPress={() => changeQty(l.itemId, 1)} hitSlop={8}><MaterialCommunityIcons name="plus" size={18} color={colors.primary} /></Pressable>
              </View>
              <Text style={{ flex: 1, marginLeft: 12, color: colors.text }}>{l.name}</Text>
              <Text style={{ fontWeight: '600', color: colors.text }}>{peso(l.price * l.qty)}</Text>
            </View>
          ))}
          <Pressable onPress={() => router.back()}><Text style={[styles.link, { marginTop: 8 }]}>+ Add more items</Text></Pressable>
        </Card>

        <Card>
          <SectionTitle>Note to restaurant / rider</SectionTitle>
          <TextInput
            value={note} onChangeText={setNote} placeholder="e.g. no onions, leave at the guard" placeholderTextColor={colors.muted}
            style={styles.note} multiline
          />
        </Card>

        <Card>
          <SectionTitle>Payment</SectionTitle>
          <PaymentPicker />
        </Card>

        <Card>
          {t.lines.map((l) => (
            <Row key={l.label} label={l.label} value={l.amount < 0 ? `−${peso(-l.amount)}` : l.amount === 0 ? 'FREE' : peso(l.amount)} valueColor={l.amount <= 0 ? colors.ride : undefined} />
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          <Row label="Total" value={peso(t.total)} bold />
        </Card>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Button title={`Place order · ${peso(t.total)}`} onPress={place} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '700' },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  note: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 60, color: colors.text, textAlignVertical: 'top' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
