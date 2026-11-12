export type Vehicle = 'moto' | 'car';

/** Pasugo vehicles. Fares are computed by the app from distance and expected travel time. */
export const VEHICLES: Record<Vehicle, { label: string; icon: string; base: number; perKm: number; perMin: number; min: number; blurb: string }> = {
  moto: { label: 'Motorcycle', icon: 'motorbike', base: 40, perKm: 10, perMin: 1, min: 50, blurb: 'Documents, small bags, or 1 person' },
  car: { label: 'Car', icon: 'car', base: 90, perKm: 18, perMin: 2, min: 140, blurb: 'Bigger items, or up to 4 people' },
};

/** Average city speed in km/h by vehicle, used for ETA estimates. */
const SPEED: Record<Vehicle, number> = { moto: 24, car: 16 };

export function etaMinutes(km: number, vehicle: Vehicle = 'moto') {
  return Math.max(3, Math.round((km / SPEED[vehicle]) * 60));
}

export function pasugoFee(km: number, vehicle: Vehicle) {
  const t = VEHICLES[vehicle];
  return Math.round(Math.max(t.min, t.base + t.perKm * km + t.perMin * etaMinutes(km, vehicle)));
}

/**
 * The only amount the app charges for a buy-and-deliver order. The items themselves are
 * paid by the rider at the store and repaid by the customer based on the receipt.
 */
export function deliveryFee(km: number) {
  return Math.round(49 + Math.max(0, km - 2) * 10);
}
export const RIDER_SHARE = 0.8;
