export type Vehicle = 'moto' | 'car';

export const VEHICLES: Record<Vehicle, { label: string; icon: string; blurb: string }> = {
  moto: { label: 'Motorcycle', icon: 'motorbike', blurb: 'Documents, small bags, or 1 person' },
  car: { label: 'Car', icon: 'car', blurb: 'Bigger items, or up to 4 people' },
};

/** Prices and commission, as stored in the `settings` table and edited in the admin dashboard. */
export type Prices = {
  /** Riders' share of the delivery/pasugo fee when the beta waiver is off (e.g. 0.7). */
  rider_share: number;
  /** Fixed fee added to every order for the company (waived during the beta). */
  booking_fee: number;
  /** Beta: no booking fee and no commission — riders keep 100% of the fee. */
  beta_waiver: boolean;
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
  rider_share: 0.7,
  booking_fee: 15,
  beta_waiver: true,
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

/** The rider's share that applies to new orders right now (100% during the beta waiver). */
export const currentShare = (p: Prices) => (p.beta_waiver ? 1 : p.rider_share);
/** The booking fee that applies to new orders right now (₱0 during the beta waiver). */
export const currentBookingFee = (p: Prices) => (p.beta_waiver ? 0 : p.booking_fee);

/** Reads the `settings` row (numeric columns may arrive as strings). */
export function parsePrices(row: Record<string, unknown> | null): Prices {
  if (!row) return DEFAULT_PRICES;
  const out = { ...DEFAULT_PRICES } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_PRICES)) {
    if (row[k] === undefined || row[k] === null) continue;
    out[k] = k === 'beta_waiver' ? Boolean(row[k]) : Number(row[k]);
  }
  return out as Prices;
}
