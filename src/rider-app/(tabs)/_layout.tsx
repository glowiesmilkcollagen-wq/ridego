import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const icon = (name: string) => ({ color, size }: { color: any; size: number }) => (
  <MaterialCommunityIcons name={name as any} color={color} size={size} />
);

export default function RiderTabs() {
  const { state } = useStore();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.ride, headerShown: false, tabBarLabelStyle: { fontWeight: '600' } }}>
      <Tabs.Screen name="index" options={{ title: 'Jobs', tabBarIcon: icon('moped'), tabBarBadge: state.driver.active ? '1' : undefined }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: icon('wallet-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('account-circle-outline') }} />
    </Tabs>
  );
}
