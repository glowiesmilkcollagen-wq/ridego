import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen, { NotConfigured } from '@/components/AuthScreen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';
import { supabaseConfigured } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function RootLayout() {
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
  if (loading) return <Loading />;
  if (!session) return <AuthScreen title="RideGo" subtitle="Pabili and Pasugo — we buy it, pick it up, and bring it to you." emoji="🛵" />;
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="order" options={{ title: 'What to buy' }} />
      <Stack.Screen name="track/[id]" options={{ title: 'Tracking' }} />
      <Stack.Screen name="place-search" options={{ title: 'Choose location', presentation: 'modal' }} />
    </Stack>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
