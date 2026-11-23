import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { LatLng } from '@/lib/geo';
import { colors } from '@/lib/theme';

export type PinMapHandle = { moveTo: (p: LatLng) => void };

/** A map with a fixed pin in the middle: the customer drags the map until the pin sits on the place. */
export default function PinMap({ start, onChange, height = 320, handle, onTouchingChange }: {
  start: LatLng; onChange: (p: LatLng) => void; height?: number; handle?: React.MutableRefObject<PinMapHandle | null>;
  /** True while a finger is on the map, so the screen can stop scrolling and let the map move. */
  onTouchingChange?: (touching: boolean) => void;
}) {
  const map = useRef<MapView>(null);
  const moveTo = (p: LatLng) => map.current?.animateToRegion({ ...p, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 400);
  if (handle) handle.current = { moveTo };
  return (
    <View
      style={{ height, borderRadius: 16, overflow: 'hidden' }}
      onTouchStart={() => onTouchingChange?.(true)}
      onTouchEnd={() => onTouchingChange?.(false)}
      onTouchCancel={() => onTouchingChange?.(false)}
    >
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...start, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
        // iPhone maps can ignore the starting zoom before they finish loading: centre again once ready.
        onMapReady={() => map.current?.animateToRegion({ ...start, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 0)}
        onRegionChangeComplete={(r) => onChange({ latitude: r.latitude, longitude: r.longitude })}
        // Tapping a spot moves the pin there (the map re-centres on it).
        onPress={(e) => moveTo(e.nativeEvent.coordinate)}
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
