import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Empty } from '@/components/ui';
import { findRestaurant, MenuItem } from '@/lib/data';
import { roadKm } from '@/lib/geo';
import { deliveryFee, etaMinutes } from '@/lib/pricing';
import { cartTotals, useStore } from '@/lib/store';
import { colors, peso, radius } from '@/lib/theme';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = findRestaurant(id);
  const { state, addToCart, changeQty, clearCart } = useStore();
  const insets = useSafeAreaInsets();
  if (!r) return <Empty icon="store-off" title="Restaurant not found" />;

  const km = roadKm(r.location, state.home.location);
  const eta = r.prepMinutes + etaMinutes(km);
  const inThisCart = state.cart.restaurantId === r.id;
  const totals = cartTotals(state.cart, state.home);
  const qtyOf = (itemId: string) => (inThisCart ? state.cart.lines.find((l) => l.itemId === itemId)?.qty ?? 0 : 0);

  const add = (item: MenuItem) => {
    const line = { itemId: item.id, name: item.name, price: item.price };
    if (state.cart.restaurantId && !inThisCart) {
      Alert.alert('Start a new cart?', 'Your cart has items from another restaurant. Adding this will clear it.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'New cart', style: 'destructive', onPress: () => { clearCart(); addToCart(r.id, line); } },
      ]);
      return;
    }
    addToCart(r.id, line);
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: r.name }} />
      <SectionList
        sections={r.menu.map((m) => ({ title: m.title, data: m.items }))}
        keyExtractor={(i) => i.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: inThisCart ? 110 : 30 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.hero, { backgroundColor: r.tint }]}><Text style={{ fontSize: 80 }}>{r.emoji}</Text></View>
            <View style={styles.info}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.meta}>{r.cuisine} · {r.address}</Text>
              <View style={styles.stats}>
                <Stat icon="star" label={`${r.rating} (${r.reviews.toLocaleString()})`} color={colors.warning} />
                <Stat icon="clock-outline" label={`${eta}–${eta + 10} min`} />
                <Stat icon="moped" label={peso(deliveryFee(km))} />
              </View>
              {r.promo ? (
                <View style={styles.promo}>
                  <MaterialCommunityIcons name="tag-outline" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>{r.promo}</Text>
                </View>
              ) : null}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => {
          const qty = qtyOf(item.id);
          return (
            <View style={styles.item}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.itemName}>{item.name}{item.popular ? '  🔥' : ''}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.price}>{peso(item.price)}</Text>
              </View>
              {qty === 0 ? (
                <Pressable accessibilityLabel={`Add ${item.name}`} style={styles.add} onPress={() => add(item)}>
                  <MaterialCommunityIcons name="plus" size={22} color="#fff" />
                </Pressable>
              ) : (
                <View style={styles.stepper}>
                  <Pressable onPress={() => changeQty(item.id, -1)} hitSlop={8}><MaterialCommunityIcons name="minus" size={20} color={colors.primary} /></Pressable>
                  <Text style={{ fontWeight: '800', marginHorizontal: 12 }}>{qty}</Text>
                  <Pressable onPress={() => changeQty(item.id, 1)} hitSlop={8}><MaterialCommunityIcons name="plus" size={20} color={colors.primary} /></Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
      {inThisCart && totals.count > 0 && (
        <Pressable style={[styles.cartBar, { bottom: 16 + insets.bottom }]} onPress={() => router.push('/cart')}>
          <Text style={styles.cartText}>{totals.count} item{totals.count > 1 ? 's' : ''} · View cart</Text>
          <Text style={styles.cartText}>{peso(totals.subtotal)}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Stat({ icon, label, color = colors.text }: { icon: string; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      <Text style={{ marginLeft: 4, fontWeight: '600', color: colors.text }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 160, alignItems: 'center', justifyContent: 'center' },
  info: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 12, flexWrap: 'wrap' },
  promo: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 10, borderRadius: radius.md, marginTop: 12 },
  section: { fontSize: 18, fontWeight: '800', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemName: { fontWeight: '700', fontSize: 15, color: colors.text },
  itemDesc: { color: colors.muted, marginTop: 3 },
  price: { fontWeight: '700', marginTop: 6, color: colors.text },
  add: { backgroundColor: colors.primary, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  cartBar: {
    position: 'absolute', left: 16, right: 16, backgroundColor: colors.primary, borderRadius: radius.md,
    flexDirection: 'row', justifyContent: 'space-between', padding: 16,
  },
  cartText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
