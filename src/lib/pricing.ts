export type Vehicle = 'moto' | 'car';

export const VEHICLES: Record<Vehicle, { label: string; icon: string; blurb: string }> = {
  moto: { label: 'Motorcycle', icon: 'motorbike', blurb: 'Documents, small bags, or 1 person' },
  car: { label: 'Car', icon: 'car', blurb: 'Bigger items, or up to 4 people' },
};

/** Prices and commission, as stored in the `settings` table and edited in the admin dashboard. */
export type Prices = {
  rider_share: number;
  pabili_base: number;
  pabili_base_km: number;
  pabili_per_km: number;
  moto_base: number;
  moto_per_km: number;
  moto_per_min: number;
  moto_min: number;
  car_base: number;
  car_per_km: number;
  car_per_min: number;
  car_min: number;
};

/** Same defaults as supabase/schema.sql; used until the settings row has loaded. */
export const DEFAULT_PRICES: Prices = {
  rider_share: 0.8,
  pabili_base: 49, pabili_base_km: 2, pabili_per_km: 10,
  moto_base: 40, moto_per_km: 10, moto_per_min: 1, moto_min: 50,
  car_base: 90, car_per_km: 18, car_per_min: 2, car_min: 140,
};

/** Average city speed in km/h by vehicle, used for ETA estimates (and the per-minute part of the pasugo fee). */
const SPEED: Record<Vehicle, number> = { moto: 24, car: 16 };

export function etaMinutes(km: number, vehicle: Vehicle = 'moto') {
  return Math.max(3, Math.round((km / SPEED[vehicle]) * 60));
}

/**
 * Pabili delivery fee. The items themselves are paid by the rider at the store and repaid by the customer
 * based on the receipt. The server recomputes this when the order is placed (public.compute_fee).
 */
export function deliveryFee(km: number, p: Prices = DEFAULT_PRICES) {
  return Math.round(p.pabili_base + Math.max(0, km - p.pabili_base_km) * p.pabili_per_km);
}

/** Pasugo fee by vehicle; mirrors public.compute_fee on the server. */
export function pasugoFee(km: number, vehicle: Vehicle, p: Prices = DEFAULT_PRICES) {
  const [base, perKm, perMin, min] =
    vehicle === 'car' ? [p.car_base, p.car_per_km, p.car_per_min, p.car_min] : [p.moto_base, p.moto_per_km, p.moto_per_min, p.moto_min];
  return Math.round(Math.max(min, base + perKm * km + perMin * etaMinutes(km, vehicle)));
}

export const percent = (share: number) => `${Math.round(share * 100)}%`;
