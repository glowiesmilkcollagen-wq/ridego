import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { sendLocation } from '@/lib/api';
import { setMyLocation } from '@/lib/location';

/**
 * While `enabled` (rider online), sends the rider's position to the server so customers can follow them.
 * During a job (`onJob`) it updates every 5 seconds / 10 metres so the customer sees the rider move;
 * otherwise every 15 seconds / 30 metres. Foreground only: the app must be open.
 * Returns a message when location is unavailable.
 */
export function useLocationSharing(enabled: boolean, onJob = false) {
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
        setMyLocation({ latitude: first.coords.latitude, longitude: first.coords.longitude });
        if (!cancelled) await sendLocation(first.coords.latitude, first.coords.longitude);
        sub = await Location.watchPositionAsync(
          onJob
            ? { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 }
            : { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 30 },
          (pos) => {
            setMyLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            sendLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
          },
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
  }, [enabled, onJob]);
  return problem;
}
