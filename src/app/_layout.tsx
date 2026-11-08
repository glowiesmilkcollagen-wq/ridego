import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="restaurant/[id]" options={{ title: '' }} />
          <Stack.Screen name="cart" options={{ title: 'Checkout' }} />
          <Stack.Screen name="track/[id]" options={{ title: 'Tracking' }} />
          <Stack.Screen name="driver" options={{ title: 'Rider mode' }} />
          <Stack.Screen name="place-search" options={{ title: 'Choose location', presentation: 'modal' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
