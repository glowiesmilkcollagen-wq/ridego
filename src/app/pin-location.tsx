import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmAction, notify } from '@/components/admin/ui';
import PinMap, { PinMapHandle } from '@/components/PinMap';
import { Button } from '@/components/ui';
import { addressText, MAX_SAVED_ADDRESSES, saveAddress, useSavedAddresses } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PLACES } from '@/lib/data';
import { distanceKm, LatLng } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { errorText } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';

type Target = 'home' | 'pickup' | 'dropoff' | 'save';
const TITLES: Record<Target, string> = { home: 'Delivery address', pickup: 'Pick up from', dropoff: 'Bring to', save: 'New address' };
const LABELS = ['Home', 'Work'];

/**
 * Pin an exact spot on the map, add house no. / street / landmark, and (by default) save it for next time.
 * Opened from the address picker (target home / pickup / dropoff) or from Account → Saved addresses (target save).
 */
export default function PinLocation() {
  const params = useLocalSearchParams<{ target?: Target }>();
  const target: Target = params.target && params.target in TITLES ? params.target : 'home';
  const { userId } = useAuth();
  const { state, setHome, setPasugoStop } = useStore();
  const saved = useSavedAddresses(userId);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const map = useRef<PinMapHandle | null>(null);

  const start = (target === 'pickup' && state.pasugoDraft.pickup?.location) || (target === 'dropoff' && state.pasugoDraft.dropoff?.location) || state.home.location;
  const [pin, setPin] = useState<LatLng>(start);
  const [details, setDetails] = useState('');
  const [typed, setTyped] = useState(false); // once the customer types, the map stops filling the details in
  const [label, setLabel] = useState('');
  const [save, setSave] = useState(true);
  const [onMap, setOnMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [landmarks, setLandmarks] = useState(false);
  const [busy, setBusy] = useState(false);

  // Suggest the street from the map while the customer hasn't typed anything (phones only).
  useEffect(() => {
    if (typed || Platform.OS === 'web') return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const [a] = await Location.reverseGeocodeAsync(pin);
        if (!live || !a) return;
        const line = [a.name && a.name !== a.street ? a.name : null, a.street, a.district, a.city].filter(Boolean).join(', ');
        if (line) setDetails(line);
      } catch {
        // No suggestion: the customer types it.
      }
    }, 600);
    return () => { live = false; clearTimeout(t); };
  }, [pin, typed]);

  const moveTo = (p: LatLng) => { setPin(p); map.current?.moveTo(p); };

  const here = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return notify('Location off', 'Allow location access in Settings, or drag the map to the place.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      moveTo({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      notify('Could not get your location', 'Drag the map to the place instead.');
    } finally {
      setLocating(false);
    }
  };

  const confirm = () => {
    if (!details.trim()) return notify('Add the address details', 'Type the house or unit no., street and a landmark so the rider can find it.');
    const sameAsStart = distanceKm(pin, start) < 0.02;
    if (sameAsStart && target !== 'home') {
      return confirmAction('Is the pin in the right place?', 'You haven’t moved the map. Tap "No" and drag the map so the pin is on the exact spot, or "Yes" if it is already right.', apply);
    }
    apply();
  };

  const apply = async () => {
    const stop = { name: addressText({ label, details }), location: pin };
    setBusy(true);
    try {
      if (save) {
        try {
          await saveAddress(label, details, pin.latitude, pin.longitude);
          saved.refresh();
        } catch (e) {
          // Still use the address for this order; just tell them it wasn't saved.
          notify('Address not saved', errorText(e));
        }
      }
      if (target === 'home') setHome(stop);
      else if (target === 'pickup' || target === 'dropoff') setPasugoStop(target, stop);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
      <Stack.Screen options={{ title: TITLES[target] }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic" scrollEnabled={!onMap} keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}
      >
        <View>
          <Text style={styles.h2}>Move the map to the exact spot</Text>
          <Text style={styles.help}>Drag the map (or tap a spot) until the pin is on the gate or door.</Text>
          <PinMap start={start} handle={map} height={280} onTouchingChange={setOnMap} onChange={setPin} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Pressable onPress={here} disabled={locating} style={styles.chip}>
              {locating ? <ActivityIndicator color={colors.primary} size="small" /> : <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />}
              <Text style={styles.chipText}>My location</Text>
            </Pressable>
            <Pressable onPress={() => setLandmarks((v) => !v)} style={styles.chip}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={colors.primary} />
              <Text style={styles.chipText}>Near a landmark</Text>
            </Pressable>
          </View>
          {landmarks && (
            <View style={[styles.card, { marginTop: 10, paddingVertical: 4 }]}>
              {PLACES.map((p) => (
                <Pressable key={p.id} onPress={() => { moveTo(p.location); setLandmarks(false); }} style={styles.row}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.muted} />
                  <Text style={{ marginLeft: 10, flex: 1, color: colors.text, fontWeight: '600' }}>{p.name}</Text>
                  <Text style={{ color: colors.muted }}>{p.area}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Address details</Text>
          <TextInput
            value={details} onChangeText={(t) => { setDetails(t); setTyped(true); }} multiline placeholderTextColor={colors.muted}
            placeholder="House/unit no., street, barangay, landmark (e.g. Blk 5 Lot 2, Mabini St., near the chapel)"
            style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Name this place (optional)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {LABELS.map((l) => (
              <Pressable key={l} onPress={() => setLabel(label === l ? '' : l)} style={[styles.labelChip, label === l && styles.labelChipOn]}>
                <MaterialCommunityIcons name={l === 'Home' ? 'home-outline' : 'briefcase-outline'} size={16} color={label === l ? '#fff' : colors.text} />
                <Text style={{ fontWeight: '700', color: label === l ? '#fff' : colors.text }}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={label} onChangeText={setLabel} maxLength={40} placeholder="or type a name, e.g. Lola's house" placeholderTextColor={colors.muted} style={styles.input} />

          <View style={styles.saveRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>Save to my addresses</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                Keep up to {MAX_SAVED_ADDRESSES}. When you save more, the one you use least is replaced.
              </Text>
            </View>
            <Switch value={save} onValueChange={setSave} trackColor={{ true: colors.primary }} />
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Button title={target === 'save' ? 'Save address' : 'Use this address'} icon="map-marker-check-outline" onPress={confirm} loading={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: '800', color: colors.text },
  help: { color: colors.muted, marginTop: 4, marginBottom: 10, lineHeight: 19 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  label: { fontWeight: '700', color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, backgroundColor: '#fff' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#fff' },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  labelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  labelChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
