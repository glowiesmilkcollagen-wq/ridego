import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStartErrand } from '@/components/useStartErrand';
import { PLACES } from '@/lib/data';
import { Stop } from '@/lib/trips';
import { useStore } from '@/lib/store';
import { colors, radius } from '@/lib/theme';

export default function PlaceSearch() {
  const { target } = useLocalSearchParams<{ target: 'pickup' | 'dropoff' | 'home' | 'store' }>();
  const startErrand = useStartErrand();
  const { state, setPasugoStop, setHome } = useStore();
  const [q, setQ] = useState('');
  const [locating, setLocating] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? PLACES.filter((p) => `${p.name} ${p.area}`.toLowerCase().includes(s)) : PLACES;
  }, [q]);

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
          autoFocus value={q} onChangeText={setQ} placeholder={target === 'store' ? 'Search a store, restaurant or mall' : 'Search a place'} placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
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
});
