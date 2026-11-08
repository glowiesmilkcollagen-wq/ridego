export type LatLng = { latitude: number; longitude: number };

export const DEFAULT_LOCATION: LatLng = { latitude: 14.5547, longitude: 121.0244 }; // Makati

export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road distance is longer than straight-line distance; 1.3x is a common approximation. */
export const roadKm = (a: LatLng, b: LatLng) => distanceKm(a, b) * 1.3;

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  const k = Math.max(0, Math.min(1, t));
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * k,
    longitude: a.longitude + (b.longitude - a.longitude) * k,
  };
}

/** A point roughly `km` away from `p`, used to place a simulated rider nearby. */
export function offset(p: LatLng, km: number, bearingDeg: number): LatLng {
  const d = km / 111;
  const b = (bearingDeg * Math.PI) / 180;
  return { latitude: p.latitude + d * Math.cos(b), longitude: p.longitude + d * Math.sin(b) };
}

export function regionFor(points: LatLng[]) {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.8),
    longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.8),
  };
}
