import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/lib/theme';

/**
 * "Buy from a store not on the list": opens the screen where the customer types any store's name and says where it is.
 * With a search text, it offers that text as the store name.
 */
export default function TypeStoreRow({ q, mode, card }: { q: string; mode: 'start' | 'add'; card?: boolean }) {
  const name = q.trim();
  const open = () => router.push({ pathname: '/custom-store', params: { name, mode } });
  return (
    <Pressable onPress={open} style={({ pressed }) => [card ? styles.card : styles.row, pressed && { opacity: 0.8 }]}>
      <View style={styles.icon}><MaterialCommunityIcons name="pencil-plus-outline" size={20} color={colors.primary} /></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '800', color: colors.primary }} numberOfLines={1}>
          {name ? `Buy from “${name}”` : 'Type a store not on the list'}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 2 }}>Small shop, sari-sari store, any place — you tell the rider where</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', marginBottom: 14 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
