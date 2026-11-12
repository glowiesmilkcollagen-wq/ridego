import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RestaurantCard from '@/components/RestaurantCard';
import { Chip, Empty } from '@/components/ui';
import { CATEGORIES, Category, RESTAURANTS } from '@/lib/data';
import { errandCount, useStore } from '@/lib/store';
import { colors, radius } from '@/lib/theme';

export default function Food() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | null>(null);
  const count = errandCount(state.errand);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return RESTAURANTS.filter((r) => (!cat || r.category === cat) && (!s ||
      `${r.name} ${r.cuisine}`.toLowerCase().includes(s) ||
      r.favorites.some((f) => f.toLowerCase().includes(s))));
  }, [q, cat]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: count ? 100 : 24 }}
        ListHeaderComponent={
          <View>
            <Text style={styles.h1}>Buy & deliver</Text>
            <View style={styles.how}>
              <Text style={styles.howText}>
                Tell us what you want. A rider goes to the store, orders and pays for it, and brings it to you.
                You pay the rider back for the items (as on the receipt) plus the delivery fee.
              </Text>
            </View>

            <Pressable style={styles.anyStore} onPress={() => router.push('/place-search?target=store')}>
              <View style={styles.anyIcon}><MaterialCommunityIcons name="storefront-outline" size={24} color={colors.primary} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>Buy from any store</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }}>Any restaurant, café or shop near you</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>

            <Text style={styles.h2}>Popular places</Text>
            <View style={styles.search}>
              <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search places or food" placeholderTextColor={colors.muted} style={styles.input} />
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
        ListEmptyComponent={<Empty icon="food-off" title="No matches" subtitle="Try another search, or use “Buy from any store”" />}
      />
      {count > 0 && state.errand.store && (
        <Pressable style={styles.cartBar} onPress={() => router.push('/order')}>
          <View style={styles.badge}><Text style={{ color: colors.primary, fontWeight: '800' }}>{count}</Text></View>
          <Text style={[styles.cartText, { flex: 1 }]} numberOfLines={1}>Continue order · {state.errand.store.name}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 10 },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  how: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, marginBottom: 12 },
  howText: { color: colors.text, lineHeight: 20 },
  anyStore: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  anyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
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
  cartText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
