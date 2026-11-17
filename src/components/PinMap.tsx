import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { LatLng } from '@/lib/geo';
import { colors } from '@/lib/theme';

export type PinMapHandle = { moveTo: (p: LatLng) => void };

/** A map with a fixed pin in the middle: the customer drags the map until the pin sits on the place. */
export default function PinMap({ start, onChange, height = 320, handle }: {
  start: LatLng; onChange: (p: LatLng) => void; height?: number; handle?: React.MutableRefObject<PinMapHandle | null>;
}) {
  const map = useRef<MapView>(null);
  if (handle) handle.current = { moveTo: (p) => map.current?.animateToRegion({ ...p, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 400) };
  return (
    <View style={{ height, borderRadius: 16, overflow: 'hidden' }}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...start, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
        onRegionChangeComplete={(r) => onChange({ latitude: r.latitude, longitude: r.longitude })}
        showsUserLocation
        toolbarEnabled={false}
      />
      {/* The pin's tip marks the map's centre. */}
      <View pointerEvents="none" style={styles.pinWrap}>
        <MaterialCommunityIcons name="map-marker" size={44} color={colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrap: { position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -44 },
});
