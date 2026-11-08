import { LatLng, lerp } from './geo';
import { RideType } from './pricing';

export type Stop = { name: string; location: LatLng };
export type CartLine = { itemId: string; name: string; price: number; qty: number };
export type PaymentMethod = 'cash' | 'gcash' | 'card';
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: 'Cash', gcash: 'GCash', card: 'Credit / Debit card' };

export type Trip = {
  id: string;
  kind: 'food' | 'ride';
  createdAt: number;
  cancelledAt?: number;
  rating?: number;
  pickup: Stop;
  dropoff: Stop;
  km: number;
  rider: { name: string; plate: string; rating: number; start: LatLng };
  payment: PaymentMethod;
  lines: { label: string; amount: number }[];
  total: number;
  // food only
  restaurantId?: string;
  items?: CartLine[];
  note?: string;
  // ride only
  rideType?: RideType;
};

type Phase = { key: string; label: string; detail: string; seconds: number };

/**
 * Phases are time-based so tracking keeps working after the app restarts.
 * Durations are compressed for demo purposes; in production the status comes from your backend.
 */
export const PHASES: Record<Trip['kind'], Phase[]> = {
  food: [
    { key: 'placed', label: 'Order placed', detail: 'Waiting for the restaurant to confirm', seconds: 8 },
    { key: 'preparing', label: 'Preparing your food', detail: 'The restaurant is cooking your order', seconds: 25 },
    { key: 'pickup', label: 'Rider picking up', detail: 'Your rider is at the restaurant', seconds: 12 },
    { key: 'onway', label: 'On the way', detail: 'Your food is on its way to you', seconds: 35 },
    { key: 'done', label: 'Delivered', detail: 'Enjoy your meal!', seconds: 0 },
  ],
  ride: [
    { key: 'searching', label: 'Finding your rider', detail: 'Matching you with a nearby rider', seconds: 6 },
    { key: 'arriving', label: 'Rider is on the way', detail: 'Wait at your pickup point', seconds: 20 },
    { key: 'ontrip', label: 'On trip', detail: 'Enjoy the ride — helmet on!', seconds: 40 },
    { key: 'done', label: 'Arrived', detail: 'You have reached your destination', seconds: 0 },
  ],
};

export type Progress = {
  index: number;
  phase: Phase;
  done: boolean;
  cancelled: boolean;
  riderPos: LatLng | null;
  secondsLeft: number;
};

export function getProgress(trip: Trip, now = Date.now()): Progress {
  const phases = PHASES[trip.kind];
  const end = trip.cancelledAt ?? now;
  let elapsed = (end - trip.createdAt) / 1000;
  const total = phases.reduce((s, p) => s + p.seconds, 0);
  const secondsLeft = Math.max(0, total - elapsed);

  let index = phases.length - 1;
  let t = 1;
  for (let i = 0; i < phases.length - 1; i++) {
    if (elapsed < phases[i].seconds) {
      index = i;
      t = elapsed / phases[i].seconds;
      break;
    }
    elapsed -= phases[i].seconds;
  }
  const key = phases[index].key;
  const { start } = trip.rider;
  const p = trip.pickup.location;
  const d = trip.dropoff.location;

  let riderPos: LatLng | null = null;
  if (trip.kind === 'food') {
    // Rider heads to the restaurant while food is being prepared, then delivers.
    if (key === 'placed') riderPos = start;
    else if (key === 'preparing') riderPos = lerp(start, p, t);
    else if (key === 'pickup') riderPos = p;
    else if (key === 'onway') riderPos = lerp(p, d, t);
    else riderPos = d;
  } else {
    if (key === 'searching') riderPos = null;
    else if (key === 'arriving') riderPos = lerp(start, p, t);
    else if (key === 'ontrip') riderPos = lerp(p, d, t);
    else riderPos = d;
  }

  return {
    index,
    phase: phases[index],
    done: !trip.cancelledAt && index === phases.length - 1,
    cancelled: !!trip.cancelledAt,
    riderPos,
    secondsLeft,
  };
}

/** Customers can cancel before food is being prepared, or before the ride starts. */
export function canCancel(trip: Trip, now = Date.now()) {
  const pr = getProgress(trip, now);
  if (pr.cancelled || pr.done) return false;
  return trip.kind === 'food' ? pr.phase.key === 'placed' : pr.phase.key !== 'ontrip';
}
