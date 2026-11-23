import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen, { NotConfigured } from '@/components/AuthScreen';
import { RiderProvider, useRider } from '@/components/rider/RiderContext';
import { RegisterScreen, StatusScreen } from '@/components/rider/RiderOnboarding';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useMyLocation } from '@/lib/location';
import { usePushNotifications } from '@/lib/push';
import { supabaseConfigured } from '@/lib/supabase';
import { useInstantUpdates } from '@/lib/updates';
import { colors } from '@/lib/theme';

/** Root of the separate RideGo Rider app (built with APP_VARIANT=rider). */
export default function RiderRootLayout() {
  useInstantUpdates();
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {supabaseConfigured ? (
        <AuthProvider>
          <RiderProvider>
            <Gate />
          </RiderProvider>
        </AuthProvider>
      ) : (
        <NotConfigured />
      )}
    </SafeAreaProvider>
  );
}

function Gate() {
  const { session, loading } = useAuth();
  const { rider, loading: riderLoading, refresh, setRider } = useRider();
  // Registered even before approval, so the rider hears "You're approved".
  usePushNotifications('rider', !!session && !!rider);
  // Ask for location as soon as the rider is logged in, so the jobs map can centre on them.
  useMyLocation(!!session);
  if (loading || (session && riderLoading)) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.ride} size="large" /></View>;
  }
  if (!session) return <AuthScreen title="RideGo Rider" subtitle="Receive pabili and pasugo jobs, navigate, and track your earnings." emoji="🏍️" color={colors.ride} />;
  if (!rider) return <RegisterScreen onDone={setRider} />;
  if (rider.status !== 'approved') return <StatusScreen rider={rider} onRefresh={refresh} />;
  return (
    <Stack screenOptions={{ headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' }, headerTransparent: false, headerStyle: { backgroundColor: '#fff' }, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
