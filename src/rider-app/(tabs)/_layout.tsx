import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { ACTIVE_STATUSES, useRiderOrders } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

const icon = (name: string) => ({ color, size }: { color: any; size: number }) => (
  <MaterialCommunityIcons name={name as any} color={color} size={size} />
);

export default function RiderTabs() {
  const { userId } = useAuth();
  const orders = useRiderOrders(userId);
  const hasJob = (orders.data ?? []).some((o) => ACTIVE_STATUSES.includes(o.status));
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.ride, headerShown: false, tabBarLabelStyle: { fontWeight: '600' } }}>
      <Tabs.Screen name="index" options={{ title: 'Jobs', tabBarIcon: icon('moped'), tabBarBadge: hasJob ? '1' : undefined }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: icon('wallet-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('account-circle-outline') }} />
    </Tabs>
  );
}
