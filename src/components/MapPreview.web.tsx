import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { regionFor } from '@/lib/geo';
import { MapPreviewProps, PIN_STYLE } from './MapPreview.types';

/** Web has no native map; this draws a schematic so the app can be previewed in a browser. */
export default function MapPreview({ pins, route, height = 260, rideIcon = 'motorbike' }: MapPreviewProps) {
  const r = regionFor([...pins.map((p) => p.coord), ...(route ?? [])]);
  const pos = (c: { latitude: number; longitude: number }) => ({
    left: `${50 + ((c.longitude - r.longitude) / r.longitudeDelta) * 100}%` as const,
    top: `${50 - ((c.latitude - r.latitude) / r.latitudeDelta) * 100}%` as const,
  });
  return (
    <View style={[styles.map, { height }]}>
      {[...Array(8)].map((_, i) => (
        <View key={`h${i}`} style={[styles.road, { top: `${i * 14 + 4}%`, left: 0, right: 0, height: i % 3 === 0 ? 6 : 2 }]} />
      ))}
      {[...Array(6)].map((_, i) => (
        <View key={`v${i}`} style={[styles.road, { left: `${i * 19 + 6}%`, top: 0, bottom: 0, width: i % 2 === 0 ? 6 : 2 }]} />
      ))}
      {pins.map((p) => {
        const s = PIN_STYLE[p.kind];
        const icon = p.kind === 'rider' ? rideIcon : s.icon;
        return (
          <View key={p.id} style={[styles.pin, pos(p.coord), { backgroundColor: s.color }]}>
            <MaterialCommunityIcons name={icon as any} size={16} color="#fff" />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: '#E8EEF2', overflow: 'hidden' },
  road: { position: 'absolute', backgroundColor: '#fff' },
  pin: {
    position: 'absolute', width: 30, height: 30, marginLeft: -15, marginTop: -15, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
});
