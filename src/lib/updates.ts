import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Instant updates (EAS Update): checks for a new version when the app opens and when it comes back to the front.
 * A downloaded update is applied the next time the user returns to the app, so nobody is interrupted mid-screen.
 * Does nothing in development, Expo Go or the web version.
 */
export function useInstantUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let ready = false;
    const check = async () => {
      try {
        const r = await Updates.checkForUpdateAsync();
        if (r.isAvailable) {
          await Updates.fetchUpdateAsync();
          ready = true;
        }
      } catch {
        // Offline or the update server is unreachable: keep the current version.
      }
    };
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      if (ready) Updates.reloadAsync().catch(() => {});
      else check();
    });
    return () => sub.remove();
  }, []);
}
