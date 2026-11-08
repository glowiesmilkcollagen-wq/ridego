export type RideType = 'moto' | 'moto_plus' | 'car';

export const RIDE_TYPES: Record<RideType, { label: string; icon: string; seats: number; base: number; perKm: number; perMin: number; min: number; blurb: string }> = {
  moto: { label: 'Moto', icon: 'motorbike', seats: 1, base: 40, perKm: 10, perMin: 1, min: 50, blurb: 'Beat traffic on two wheels' },
  moto_plus: { label: 'Moto+', icon: 'motorbike-electric', seats: 1, base: 55, perKm: 12, perMin: 1.2, min: 70, blurb: 'Top-rated riders, newer bikes' },
  car: { label: 'Car', icon: 'car', seats: 4, base: 90, perKm: 18, perMin: 2, min: 140, blurb: 'Room for up to 4' },
};

/** Average city speed in km/h by vehicle, used for ETA estimates. */
const SPEED: Record<RideType, number> = { moto: 24, moto_plus: 24, car: 16 };

export function etaMinutes(km: number, type: RideType = 'moto') {
  return Math.max(3, Math.round((km / SPEED[type]) * 60));
}

export function rideFare(km: number, type: RideType) {
  const t = RIDE_TYPES[type];
  return Math.round(Math.max(t.min, t.base + t.perKm * km + t.perMin * etaMinutes(km, type)));
}

export function deliveryFee(km: number) {
  return Math.round(29 + Math.max(0, km - 2) * 8);
}

export const SERVICE_FEE_RATE = 0.05;
export const RIDER_SHARE = 0.8;
