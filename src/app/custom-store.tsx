import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PinMap, { PinMapHandle } from '@/components/PinMap';
import { Button } from '@/components/ui';
import { useStartErrand } from '@/components/useStartErrand';
import { PLACES } from '@/lib/data';
import { LatLng } from '@/lib/geo';
import { MAX_STORES, useStore } from '@/lib/store';
import { colors, radius } from '@/lib/theme';

/**
 * A store that is not in RideGo's list (a sari-sari store, a small shop): the customer types its name and
 * directions, and pins it on the map so the app can work out the route and fee.
 * mode=start: begin a pabili order with it · mode=add: add it to the order being drafted.
 */
export default function CustomStore() {
  const params = useLocalSearchParams<{ name?: string; mode?: 'start' | 'add' }>();
  const mode = params.mode === 'add' ? 'add' : 'start';
  const { state, addErrandStore } = useStore();
  const startErrand = useStartErrand();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(params.name ?? '');
  const [directions, setDirections] = useState('');
  const [pin, setPin] = useState<LatLng>(state.home.location);
  const [moved, setMoved] = useState(false);
  const [landmarks, setLandmarks] = useState(false);
  const [locating, setLocating] = useState(false);
  const map = useRef<PinMapHandle | null>(null);

  const moveTo = (p: LatLng) => {
    setPin(p);
    setMoved(true);
    map.current?.moveTo(p);
  };

  const confirm = () => {
    const clean = name.trim();
    if (!clean) return Alert.alert('Store name', 'Type the name of the store so the rider knows what to look for.');
    // The rider sees the name and the directions; the pin sets the route and fee.
    const stop = { name: directions.trim() ? `${clean} — ${directions.trim()}` : clean, location: pin };
    if (mode === 'add') {
      if (state.errand.stops.length >= MAX_STORES) return Alert.alert('Order is full', `An order can include up to ${MAX_STORES} stores.`);
      addErrandStore(stop, null);
      router.dismissTo('/order');
    } else {
      startErrand(stop, null, 'replace');
    }
  };

  const here = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Location off', 'Allow location access in Settings, or drag the map to the store.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      moveTo({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      Alert.alert('Could not get location', 'Drag the map to the store instead.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: mode === 'add' ? 'Add a store not on the list' : 'Buy from a store not on the list' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Store name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Aling Nena's sari-sari store" placeholderTextColor={colors.muted} style={styles.input} autoFocus={!name} />
          <Text style={[styles.label, { marginTop: 12 }]}>Directions for the rider (optional)</Text>
          <TextInput
            value={directions} onChangeText={setDirections} multiline placeholderTextColor={colors.muted} style={[styles.input, { minHeight: 56, textAlignVertical: 'top' }]}
            placeholder="e.g. green gate beside the barangay hall, Purok 3"
          />
        </View>

        <View>
          <Text style={styles.h2}>Pin the store on the map</Text>
          <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 10, lineHeight: 19 }}>
            Drag the map until the pin is on the store. This sets the route and the delivery fee.
          </Text>
          <PinMap start={state.home.location} handle={map} onChange={(p) => { setPin(p); setMoved(true); }} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable onPress={here} disabled={locating} style={styles.chip}>
              {locating ? <ActivityIndicator color={colors.primary} size="small" /> : <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />}
              <Text style={styles.chipText}>My location</Text>
            </Pressable>
            <Pressable onPress={() => moveTo(state.home.location)} style={styles.chip}>
              <MaterialCommunityIcons name="home-outline" size={18} color={colors.primary} />
              <Text style={styles.chipText}>Delivery address</Text>
            </Pressable>
            <Pressable onPress={() => setLandmarks((v) => !v)} style={styles.chip}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={colors.primary} />
              <Text style={styles.chipText}>Landmark</Text>
            </Pressable>
          </View>
          {landmarks && (
            <View style={[styles.card, { marginTop: 10, paddingVertical: 4 }]}>
              {PLACES.map((p) => (
                <Pressable key={p.id} onPress={() => { moveTo(p.location); setLandmarks(false); }} style={styles.landmark}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.muted} />
                  <Text style={{ marginLeft: 10, flex: 1, color: colors.text, fontWeight: '600' }}>{p.name}</Text>
                  <Text style={{ color: colors.muted }}>{p.area}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {!moved && <Text style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>The map starts at your delivery address — move it if the store is elsewhere.</Text>}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Button title="Use this location" icon="map-marker-check-outline" onPress={confirm} disabled={!name.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  label: { fontWeight: '700', color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, backgroundColor: '#fff' },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#fff' },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  landmark: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
