import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { regionFor } from '@/lib/geo';
import { MapPreviewProps, PIN_STYLE } from './MapPreview.types';

export default function MapPreview({ pins, route, height = 260, rideIcon = 'motorbike' }: MapPreviewProps) {
  const points = [...pins.map((p) => p.coord), ...(route ?? [])];
  const region = regionFor(points.length ? points : pins.map((p) => p.coord));
  return (
    <View style={{ height }}>
      <MapView style={StyleSheet.absoluteFill} region={region} showsUserLocation={false} toolbarEnabled={false}>
        {route && <Polyline coordinates={route} strokeColor="#E5195E" strokeWidth={4} lineDashPattern={[8, 6]} />}
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
