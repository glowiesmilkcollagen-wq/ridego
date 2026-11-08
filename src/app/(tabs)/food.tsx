import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RestaurantCard from '@/components/RestaurantCard';
import { Chip, Empty } from '@/components/ui';
import { CATEGORIES, Category, RESTAURANTS } from '@/lib/data';
import { cartTotals, useStore } from '@/lib/store';
import { colors, peso, radius } from '@/lib/theme';

export default function Food() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | null>(null);
  const totals = cartTotals(state.cart, state.home);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return RESTAURANTS.filter((r) => (!cat || r.category === cat) && (!s ||
      `${r.name} ${r.cuisine}`.toLowerCase().includes(s) ||
      r.menu.some((m) => m.items.some((i) => i.name.toLowerCase().includes(s)))));
  }, [q, cat]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: totals.count ? 100 : 24 }}
        ListHeaderComponent={
          <View>
            <Text style={styles.h1}>Food delivery</Text>
            <View style={styles.search}>
              <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search restaurants or dishes" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 14, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
              <Chip label="All" active={!cat} onPress={() => setCat(null)} />
              {CATEGORIES.map((c) => (
                <Chip key={c.key} label={c.key} icon={c.emoji} active={cat === c.key} onPress={() => setCat(cat === c.key ? null : c.key)} />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => <RestaurantCard r={item} from={state.home.location} />}
        ListEmptyComponent={<Empty icon="food-off" title="No matches" subtitle="Try a different search or category" />}
      />
      {totals.count > 0 && (
        <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
          <View style={styles.badge}><Text style={{ color: colors.primary, fontWeight: '800' }}>{totals.count}</Text></View>
          <Text style={[styles.cartText, { flex: 1 }]} numberOfLines={1}>View cart · {totals.restaurant?.name}</Text>
          <Text style={styles.cartText}>{peso(totals.subtotal)}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
  search: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 16, color: colors.text },
  cartBar: {
    position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: colors.primary, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10,
  },
  badge: { backgroundColor: '#fff', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cartText: { color: '#fff', fontWeight: '800', fontSize: 15, flexShrink: 1 },
});
