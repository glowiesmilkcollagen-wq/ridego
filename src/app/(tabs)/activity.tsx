import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TripCard from '@/components/TripCard';
import { Chip, Empty } from '@/components/ui';
import { useNow, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function Activity() {
  const { state } = useStore();
  const now = useNow(2000);
  const [filter, setFilter] = useState<'all' | 'food' | 'ride'>('all');
  const trips = state.trips.filter((t) => filter === 'all' || t.kind === filter);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 }}>Activity</Text>
            <View style={{ flexDirection: 'row', marginBottom: 14 }}>
              <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
              <Chip label="Food" icon="🍔" active={filter === 'food'} onPress={() => setFilter('food')} />
              <Chip label="Rides" icon="🏍️" active={filter === 'ride'} onPress={() => setFilter('ride')} />
            </View>
          </View>
        }
        renderItem={({ item }) => <TripCard trip={item} now={now} />}
        ListEmptyComponent={<Empty icon="receipt-text-outline" title="Nothing here yet" subtitle="Your food orders and rides will show up here." />}
      />
    </SafeAreaView>
  );
}
