import React, { useState } from 'react';
import { SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TripCard from '@/components/TripCard';
import { Chip, Empty } from '@/components/ui';
import { isOpen, useMyOrders } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

/** The customer's orders: the ones still going (tap to track) on top, then the order history. */
export default function Activity() {
  const { userId } = useAuth();
  const orders = useMyOrders(userId);
  const [filter, setFilter] = useState<'all' | 'pabili' | 'pasugo'>('all');
  const trips = (orders.data ?? []).filter((o) => filter === 'all' || o.kind === filter);
  const current = trips.filter(isOpen);
  const past = trips.filter((o) => !isOpen(o));
  const sections = [
    ...(current.length ? [{ title: 'Current — tap to track', data: current }] : []),
    ...(past.length ? [{ title: 'Order history', data: past }] : []),
  ];
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 }}>Activity</Text>
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
              <Chip label="Pabili" icon="🛒" active={filter === 'pabili'} onPress={() => setFilter('pabili')} />
              <Chip label="Pasugo" icon="📦" active={filter === 'pasugo'} onPress={() => setFilter('pasugo')} />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 14, marginBottom: 10 }}>{section.title}</Text>
        )}
        renderItem={({ item }) => <TripCard order={item} />}
        refreshing={false}
        onRefresh={orders.refresh}
        ListEmptyComponent={<Empty icon="receipt-text-outline" title="Nothing here yet" subtitle="Your pabili orders and pasugo requests will show up here." />}
      />
    </SafeAreaView>
  );
}
