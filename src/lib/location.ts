import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { LatLng } from './geo';

/**
 * The phone's current position, shared by all screens. The first call asks for permission
 * (the system prompt appears right after login); later calls reuse the answer.
 */
let current: LatLng | null = null;
let permission: 'unknown' | 'granted' | 'denied' = 'unknown';
let inflight: Promise<LatLng | null> | null = null;
const listeners = new Set<() => void>();

export function locateMe(): Promise<LatLng | null> {
  if (Platform.OS === 'web') return Promise.resolve(null);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      permission = status === 'granted' ? 'granted' : 'denied';
      if (permission !== 'granted') return null;
      // A recent known position appears instantly; then get a fresh one.
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }).catch(() => null);
      if (last) set({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      set({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      return current;
    } catch {
      return current;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Lets the rider's live tracking share each new position with the maps on screen. */
export function setMyLocation(p: LatLng) {
  set(p);
}

function set(p: LatLng) {
  current = p;
  listeners.forEach((f) => f());
}

/** Asks for location when `enabled` turns on (and again when the app comes back to the front). */
export function useMyLocation(enabled = true) {
  const [, rerender] = useState(0);
  useEffect(() => {
    const f = () => rerender((n) => n + 1);
    listeners.add(f);
    if (enabled) locateMe().then(f);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active' && enabled) locateMe().then(f); });
    return () => { listeners.delete(f); sub.remove(); };
  }, [enabled]);
  return { location: current, denied: permission === 'denied' };
}

/** A short place name for a position, e.g. "Mabini St, Carcar City" (phones only). */
export async function placeName(p: LatLng): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const [a] = await Location.reverseGeocodeAsync(p);
    if (!a) return null;
    return [a.street ?? a.name, a.district ?? a.subregion, a.city].filter(Boolean).slice(0, 3).join(', ') || null;
  } catch {
    return null;
  }
}
