import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { sendLocation } from '@/lib/api';

/**
 * While `enabled` (rider online), sends the rider's position to the server so customers can follow them.
 * Foreground only: the app must be open. Returns a message when location is unavailable.
 */
export function useLocationSharing(enabled: boolean) {
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return setProblem('Location is off. Customers can’t see where you are — allow location for RideGo Rider in Settings.');
        setProblem(null);
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) await sendLocation(first.coords.latitude, first.coords.longitude);
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 30 },
          (pos) => { sendLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {}); },
        );
        if (cancelled) sub.remove();
      } catch {
        setProblem('Could not read your location.');
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);
  return problem;
}
