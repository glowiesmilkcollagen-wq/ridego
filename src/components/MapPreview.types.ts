import { LatLng } from '@/lib/geo';

export type MapPin = { id: string; coord: LatLng; kind: 'pickup' | 'dropoff' | 'rider' | 'store' };
export type MapPreviewProps = { pins: MapPin[]; route?: [LatLng, LatLng]; height?: number; rideIcon?: 'motorbike' | 'car' };

export const PIN_STYLE: Record<MapPin['kind'], { color: string; icon: string }> = {
  pickup: { color: '#0F9D58', icon: 'map-marker' },
  dropoff: { color: '#E5195E', icon: 'flag-checkered' },
  rider: { color: '#1A1A1A', icon: 'motorbike' },
  store: { color: '#F59E0B', icon: 'storefront' },
};
