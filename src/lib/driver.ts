import { PLACES, RESTAURANTS } from './data';
import { LatLng, roadKm } from './geo';
import { deliveryFee, RideType, rideFare, RIDER_SHARE } from './pricing';

export type DriverJob = {
  id: string;
  kind: 'food' | 'ride';
  pickup: { name: string; location: LatLng };
  dropoff: { name: string; location: LatLng };
  km: number;
  /** What the customer is charged by the app (delivery fee or ride fare). */
  fee: number;
  payout: number;
  customer: string;
  detail: string;
  /** Buy-and-deliver: what to buy, and what the rider actually paid at the store. */
  items?: string[];
  receipt?: number;
  /** 0 = heading to pickup, 1 = picked up / trip started, 2 = arriving at drop-off, 3 = completed */
  stage: number;
  createdAt: number;
  completedAt?: number;
};

const CUSTOMERS = ['Anna L.', 'Bea C.', 'Miguel P.', 'Trish G.', 'Kevin Y.', 'Liza M.', 'Ramon F.'];
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export const STAGES: Record<DriverJob['kind'], string[]> = {
  food: ['Arrived at store', 'Items bought', 'Delivered & paid'],
  ride: ['Arrived at pickup', 'Start trip', 'Complete trip'],
};
export const STAGE_STATUS: Record<DriverJob['kind'], string[]> = {
  food: ['Head to the store', 'Order and pay for the items', 'Deliver and collect payment'],
  ride: ['Head to pickup point', 'Passenger boarding', 'Drive to destination'],
};

/** Generates mock incoming requests. In production these arrive from your dispatch backend. */
export function generateJobs(count = 4): DriverJob[] {
  return Array.from({ length: count }, (_, i) => {
    const food = Math.random() < 0.5;
    const drop = pick(PLACES);
    if (food) {
      const r = pick(RESTAURANTS);
      const km = roadKm(r.location, drop.location);
      const items = [...r.favorites].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
      return {
        id: `J-${Date.now().toString(36)}-${i}`, kind: 'food', km, stage: 0, createdAt: Date.now(),
        pickup: { name: r.name, location: r.location },
        dropoff: { name: `${drop.name}, ${drop.area}`, location: drop.location },
        fee: deliveryFee(km),
        payout: Math.round(deliveryFee(km) * RIDER_SHARE),
        customer: pick(CUSTOMERS),
        detail: `Buy ${items.length} item${items.length > 1 ? 's' : ''}`,
        items,
      };
    }
    let from = pick(PLACES);
    while (from.id === drop.id) from = pick(PLACES);
    const km = roadKm(from.location, drop.location);
    const type: RideType = Math.random() < 0.8 ? 'moto' : 'moto_plus';
    return {
      id: `J-${Date.now().toString(36)}-${i}`, kind: 'ride', km, stage: 0, createdAt: Date.now(),
      pickup: { name: `${from.name}, ${from.area}`, location: from.location },
      dropoff: { name: `${drop.name}, ${drop.area}`, location: drop.location },
      fee: rideFare(km, type),
      payout: Math.round(rideFare(km, type) * RIDER_SHARE),
      customer: pick(CUSTOMERS),
      detail: type === 'moto' ? 'Moto · 1 passenger' : 'Moto+ · 1 passenger',
    };
  });
}
