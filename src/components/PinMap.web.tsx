import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { LatLng } from '@/lib/geo';
import { colors } from '@/lib/theme';

export type PinMapHandle = { moveTo: (p: LatLng) => void };

/** Web has no draggable native map; the pin follows "My location" or the landmark list instead. */
export default function PinMap({ start, height = 320, handle, onChange }: {
  start: LatLng; onChange: (p: LatLng) => void; height?: number; handle?: React.MutableRefObject<PinMapHandle | null>;
  onTouchingChange?: (touching: boolean) => void;
}) {
  const [pos, setPos] = React.useState(start);
  if (handle) handle.current = { moveTo: (p) => { setPos(p); onChange(p); } };
  return (
    <View style={{ height, borderRadius: 16, backgroundColor: '#E8EEF2', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <MaterialCommunityIcons name="map-marker" size={44} color={colors.primary} />
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>
        Pin at {pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}{'\n'}On a phone you drag the map to place the pin.
      </Text>
    </View>
  );
}
