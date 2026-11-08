import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const icon = (name: string) => ({ color, size }: { color: any; size: number }) => (
  <MaterialCommunityIcons name={name as any} color={color} size={size} />
);

export default function TabsLayout() {
  const { state } = useStore();
  const count = state.cart.lines.reduce((s, l) => s + l.qty, 0);
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerShown: false, tabBarLabelStyle: { fontWeight: '600' } }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-variant') }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: icon('food'), tabBarBadge: count || undefined }} />
      <Tabs.Screen name="ride" options={{ title: 'Ride', tabBarIcon: icon('motorbike') }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: icon('receipt-text-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('account-circle-outline') }} />
    </Tabs>
  );
}
