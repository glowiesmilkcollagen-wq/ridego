import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { confirmAction, notify } from '@/components/admin/ui';
import { Button } from '@/components/ui';
import { deleteAddress, MAX_SAVED_ADDRESSES, SavedAddress, useSavedAddresses } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorText } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';

const iconFor = (label: string): any => (/^home$/i.test(label.trim()) ? 'home-outline' : /^work$/i.test(label.trim()) ? 'briefcase-outline' : 'map-marker-star-outline');

/** Account → Saved addresses: see, add and delete the customer's pinned places (up to 20). */
export default function SavedAddresses() {
  const { userId } = useAuth();
  const { addresses, loading, refresh } = useSavedAddresses(userId);

  const remove = (a: SavedAddress) =>
    confirmAction('Delete this address?', a.label ? `${a.label} · ${a.details}` : a.details, async () => {
      try {
        await deleteAddress(a.id);
        refresh();
      } catch (e) {
        notify('Could not delete', errorText(e));
      }
    });

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      data={addresses}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            {addresses.length} of {MAX_SAVED_ADDRESSES} saved. When you save more than {MAX_SAVED_ADDRESSES}, the one you use least is replaced.
          </Text>
          <Button title="Add an address" icon="map-marker-plus-outline" onPress={() => router.push('/pin-location?target=save')} />
        </View>
      }
      ListEmptyComponent={
        loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 24 }}>No saved addresses yet. Pin one on the map and it appears here.</Text>
        )
      }
      renderItem={({ item: a }) => (
        <View style={styles.card}>
          <MaterialCommunityIcons name={iconFor(a.label)} size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{a.label || 'Saved place'}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{a.details}</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>Used {a.use_count} {a.use_count === 1 ? 'time' : 'times'}</Text>
          </View>
          <Pressable accessibilityLabel={`Delete ${a.label || a.details}`} onPress={() => remove(a)} hitSlop={10} style={{ padding: 6 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
});
