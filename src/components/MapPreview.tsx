import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { regionFor } from '@/lib/geo';
import { MapPreviewProps, PIN_STYLE } from './MapPreview.types';

const PAD = { top: 50, right: 50, bottom: 50, left: 50 };

export default function MapPreview({ pins, path, height = 260, rideIcon = 'motorbike', showsUserLocation = false }: MapPreviewProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const points = [...pins.map((p) => p.coord), ...(path ?? [])];
  // Re-fit only when the points really change (not on every render).
  const key = points.map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`).join('|');

  // Zoom after the map has loaded: before that, iPhone maps ignore the zoom level and show a whole region.
  const fit = useCallback(() => {
    if (!map.current || !points.length) return;
    if (points.length === 1) map.current.animateToRegion({ ...points[0], latitudeDelta: 0.012, longitudeDelta: 0.012 }, 300);
    else map.current.fitToCoordinates(points, { edgePadding: PAD, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => { if (ready) fit(); }, [ready, fit]);

  return (
    <View style={{ height }}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={regionFor(points.length ? points : pins.map((p) => p.coord))}
        onMapReady={() => setReady(true)}
        onLayout={() => ready && fit()}
        showsUserLocation={showsUserLocation}
        toolbarEnabled={false}
      >
        {path && path.length > 1 && (
          <Polyline coordinates={path} strokeColor="#E5195E" strokeWidth={5} lineDashPattern={path.length === 2 ? [8, 6] : undefined} />
        )}
        {pins.map((p) => {
          const s = PIN_STYLE[p.kind];
          const icon = p.kind === 'rider' ? rideIcon : s.icon;
          return (
            <Marker key={p.id} coordinate={p.coord} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={[styles.pin, { backgroundColor: s.color }]}>
                <MaterialCommunityIcons name={icon as any} size={16} color="#fff" />
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
});
