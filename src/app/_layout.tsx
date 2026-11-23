import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen, { NotConfigured } from '@/components/AuthScreen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { usePushNotifications } from '@/lib/push';
import { distanceKm } from '@/lib/geo';
import { placeName, useMyLocation } from '@/lib/location';
import { StoreProvider, useStore } from '@/lib/store';
import { supabaseConfigured } from '@/lib/supabase';
import { useInstantUpdates } from '@/lib/updates';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  useInstantUpdates();
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {supabaseConfigured ? (
        <AuthProvider>
          <StoreProvider>
            <Gate />
          </StoreProvider>
        </AuthProvider>
      ) : (
        <NotConfigured />
      )}
    </SafeAreaProvider>
  );
}

function Gate() {
  const { session, loading } = useAuth();
  usePushNotifications('customer', !!session);
  useLocationAsHome(!!session);
  if (loading) return <Loading />;
  if (!session) return <AuthScreen title="RideGo" subtitle="Pabili and Pasugo — we buy it, pick it up, and bring it to you." emoji="🛵" />;
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        // A solid bar: on newer iPhones a see-through bar lets the page slide under the title.
        headerTransparent: false,
        headerStyle: { backgroundColor: '#fff' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="order" options={{ title: 'What to buy' }} />
      <Stack.Screen name="track/[id]" options={{ title: 'Tracking' }} />
      <Stack.Screen name="place-search" options={{ title: 'Choose location' }} />
      <Stack.Screen name="store-picker" options={{ title: 'Add another store' }} />
      <Stack.Screen name="custom-store" options={{ title: 'Other store' }} />
      <Stack.Screen name="pin-location" options={{ title: 'Pin the address' }} />
      <Stack.Screen name="saved-addresses" options={{ title: 'Saved addresses' }} />
    </Stack>
  );
}

/**
 * After login, asks for location; until the customer picks a delivery address, the address (and so every map)
 * starts where the phone is. A chosen or saved address is never replaced.
 */
function useLocationAsHome(signedIn: boolean) {
  const { state, setHomeFromGps } = useStore();
  const { location } = useMyLocation(signedIn);
  React.useEffect(() => {
    if (!state.ready || state.homeChosen || !location) return;
    if (distanceKm(location, state.home.location) < 0.05 && state.home.name !== 'Ayala Triangle, Makati') return;
    let live = true;
    placeName(location).then((name) => { if (live) setHomeFromGps({ name: name ?? 'My current location', location }); });
    return () => { live = false; };
  }, [state.ready, state.homeChosen, location, state.home, setHomeFromGps]);
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
