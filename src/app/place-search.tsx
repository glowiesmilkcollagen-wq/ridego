import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import TypeStoreRow from '@/components/TypeStoreRow';
import { useStartErrand } from '@/components/useStartErrand';
import { addressStop, markAddressUsed, SavedAddress, useSavedAddresses } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { landmarksNear } from '@/lib/nearby';
import { Stop } from '@/lib/trips';
import { useStore } from '@/lib/store';
import { colors, radius } from '@/lib/theme';

export default function PlaceSearch() {
  const { target } = useLocalSearchParams<{ target: 'pickup' | 'dropoff' | 'home' | 'store' }>();
  const startErrand = useStartErrand();
  const { state, setPasugoStop, setHome } = useStore();
  const { userId } = useAuth();
  const isAddress = target === 'home' || target === 'pickup' || target === 'dropoff';
  const saved = useSavedAddresses(isAddress ? userId : null);
  const [q, setQ] = useState('');
  const [locating, setLocating] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const near = landmarksNear(state.home.location);
    return s ? near.filter((p) => `${p.name} ${p.area}`.toLowerCase().includes(s)) : near;
  }, [q, state.home.location]);
  const savedShown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? saved.addresses.filter((a) => `${a.label} ${a.details}`.toLowerCase().includes(s)) : saved.addresses;
  }, [q, saved.addresses]);

  const chooseSaved = (a: SavedAddress) => {
    markAddressUsed(a.id).then(() => saved.refresh());
    choose(addressStop(a));
  };

  const choose = (stop: Stop) => {
    if (target === 'store') return startErrand(stop, null, 'replace');
    if (target === 'home') setHome(stop);
    else setPasugoStop(target ?? 'dropoff', stop);
    router.back();
  };

  const useCurrent = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location off', 'Allow location access in Settings, or pick a place from the list.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      let name = 'Current location';
      try {
        const [a] = await Location.reverseGeocodeAsync(coords);
        if (a) name = [a.name ?? a.street, a.city ?? a.district].filter(Boolean).join(', ') || name;
      } catch {}
      choose({ name, location: coords });
    } catch {
      Alert.alert('Could not get location', 'Please pick a place from the list.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: TITLES[target ?? 'dropoff'] }} />
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} />
        <TextInput
          autoFocus value={q} onChangeText={setQ} placeholder={target === 'store' ? 'Search a store, pharmacy, mall…' : 'Search a place'} placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      {target === 'store' && <TypeStoreRow q={q} mode="start" />}
      {isAddress && (
        <Pressable style={[styles.item, styles.pinRow]} onPress={() => router.replace(`/pin-location?target=${target}`)}>
          <View style={styles.pinIcon}><MaterialCommunityIcons name="map-marker-plus-outline" size={22} color="#fff" /></View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.name, { color: colors.primary }]}>Pin on the map</Text>
            <Text style={styles.area}>Put the pin on the exact gate or door, and save it for next time</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      )}
      <Pressable style={styles.item} onPress={useCurrent}>
        {locating ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />}
        <Text style={[styles.name, { color: colors.primary, marginLeft: 12 }]}>Use my current location</Text>
      </Pressable>
      {target !== 'home' && target !== 'store' && (
        <Pressable style={styles.item} onPress={() => choose(state.home)}>
          <MaterialCommunityIcons name="home-outline" size={22} color={colors.text} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.name}>Home</Text>
            <Text style={styles.area}>{state.home.name}</Text>
          </View>
        </Pressable>
      )}
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          savedShown.length ? (
            <View>
              <Text style={styles.section}>Saved addresses</Text>
              {savedShown.map((a) => (
                <Pressable key={a.id} style={styles.item} onPress={() => chooseSaved(a)}>
                  <MaterialCommunityIcons name={iconFor(a.label)} size={22} color={colors.primary} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{a.label || a.details}</Text>
                    {a.label ? <Text style={styles.area} numberOfLines={2}>{a.details}</Text> : null}
                  </View>
                </Pressable>
              ))}
              <Text style={styles.section}>Places</Text>
            </View>
          ) : undefined
        }
        data={results}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => choose({ name: `${item.name}, ${item.area}`, location: item.location })}>
            <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.muted} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.area}>{item.area}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const iconFor = (label: string): any => (/^home$/i.test(label.trim()) ? 'home-outline' : /^work$/i.test(label.trim()) ? 'briefcase-outline' : 'map-marker-star-outline');

const TITLES = { pickup: 'Pick up from', dropoff: 'Bring to', home: 'Delivery address', store: 'Where should the rider buy?' };

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 12, borderRadius: radius.md,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 16, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  area: { color: colors.muted, marginTop: 2 },
  pinRow: { backgroundColor: colors.primarySoft },
  pinIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
