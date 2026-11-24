import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import TypeStoreRow from '@/components/TypeStoreRow';
import { usePrices } from '@/lib/api';
import { landmarksNear, NEARBY_KM, storeStop, useNearbyStores } from '@/lib/nearby';
import { hasStore, MAX_STORES, useStore } from '@/lib/store';
import { colors, peso, radius } from '@/lib/theme';
import { Stop } from '@/lib/trips';

type Row = { key: string; title: string; subtitle: string; emoji?: string; stop: Stop; storeId: string | null };

/** Adds another store to the pabili order being drafted. */
export default function StorePicker() {
  const { state, addErrandStore } = useStore();
  const { stores } = useNearbyStores(state.home.location);
  const prices = usePrices();
  const [q, setQ] = useState('');
  const [locating, setLocating] = useState(false);

  const sections = useMemo(() => {
    const s = q.trim().toLowerCase();
    const match = (text: string) => !s || text.toLowerCase().includes(s);
    const listed: Row[] = stores
      .map((r) => ({ r, ...storeStop(r) }))
      .filter(({ stop, storeId }) => !hasStore(state.errand, stop, storeId))
      .filter(({ r }) => match(`${r.name} ${r.tagline} ${r.category} ${r.favorites.join(' ')}`))
      .map(({ r, stop, storeId }) => ({ key: r.id, title: r.name, subtitle: [r.tagline, r.address].filter(Boolean).join(' · '), emoji: r.emoji, stop, storeId }));
    const places: Row[] = landmarksNear(state.home.location).filter((p) => match(`${p.name} ${p.area}`))
      .map((p) => ({ key: p.id, title: p.name, subtitle: p.area, stop: { name: `${p.name}, ${p.area}`, location: p.location }, storeId: null }))
      .filter((r) => !hasStore(state.errand, r.stop, null));
    return [
      ...(listed.length ? [{ title: `Stores within ${NEARBY_KM} km`, data: listed }] : []),
      ...(places.length ? [{ title: 'Other places (malls, landmarks)', data: places }] : []),
    ];
  }, [q, stores, state.errand]);

  const choose = (stop: Stop, storeId: string | null) => {
    if (state.errand.stops.length >= MAX_STORES) return Alert.alert('Order is full', `An order can include up to ${MAX_STORES} stores.`);
    addErrandStore(stop, storeId);
    router.back();
  };

  const useCurrent = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Location off', 'Allow location access in Settings, or pick a store from the list.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      let name = 'Store near me';
      try {
        const [a] = await Location.reverseGeocodeAsync(coords);
        if (a) name = [a.name ?? a.street, a.city ?? a.district].filter(Boolean).join(', ') || name;
      } catch {}
      choose({ name, location: coords }, null);
    } catch {
      Alert.alert('Could not get location', 'Please pick a store from the list.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Text style={styles.hint}>Each store adds {peso(prices.pabili_per_store)} to the driver fee. The rider visits the stores in the order you add them.</Text>
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} />
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search stores, pharmacies, items…" placeholderTextColor={colors.muted} style={styles.input} />
      </View>
      <TypeStoreRow q={q} mode="add" />
      <Pressable style={styles.item} onPress={useCurrent}>
        {locating ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />}
        <Text style={[styles.name, { color: colors.primary, marginLeft: 12 }]}>A store at my current location</Text>
      </Pressable>
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(r) => r.key}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => choose(item.stop, item.storeId)}>
            {item.emoji ? <Text style={{ fontSize: 22, width: 24, textAlign: 'center' }}>{item.emoji}</Text> : <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.muted} />}
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.area} numberOfLines={1}>{item.subtitle}</Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Add</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ color: colors.muted, padding: 20 }}>No matches.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, paddingHorizontal: 16, paddingTop: 14, lineHeight: 19 },
  search: {
    flexDirection: 'row', alignItems: 'center', margin: 16, marginTop: 10, paddingHorizontal: 12, borderRadius: radius.md,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 16, color: colors.text },
  section: { fontWeight: '800', color: colors.muted, fontSize: 12, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  area: { color: colors.muted, marginTop: 2 },
});
