import { LatLng, lerp } from './geo';
import { Vehicle } from './pricing';

export type Stop = { name: string; location: LatLng };
/** One line of a buy-for-me shopping list. No price: the rider pays at the store. */
export type ErrandItem = { id: string; name: string; qty: number };
export type Contact = { name: string; phone: string };

/** What a pasugo rider picks up. */
export type Cargo = 'document' | 'parcel' | 'person';
export const CARGO: Record<Cargo, { label: string; icon: string; emoji: string; example: string }> = {
  document: { label: 'Document / folder', icon: 'file-document-outline', emoji: '📁', example: 'e.g. Blue folder with signed contracts' },
  parcel: { label: 'Bag / package', icon: 'shopping-outline', emoji: '🛍️', example: 'e.g. Plastic bag with clothes, about 3 kg' },
  person: { label: 'Person', icon: 'account-outline', emoji: '🧍', example: 'e.g. My son Miguel, 12, waiting at the school gate' },
};

export type PaymentMethod = 'cash' | 'gcash' | 'card';
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: 'Cash', gcash: 'GCash', card: 'Credit / Debit card' };

export type Trip = {
  id: string;
  kind: 'pabili' | 'pasugo';
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
  // pabili (buy & deliver) only
  items?: ErrandItem[];
  note?: string;
  /** Optional spending limit the customer gives the rider for the items. */
  budget?: number;
  // pasugo only
  vehicle?: Vehicle;
  cargo?: Cargo;
  /** What exactly to pick up, or who. */
  description?: string;
  /** Who hands the item over at pickup (or the person being picked up). */
  sender?: Contact;
  /** Who receives it at the drop-off. Empty means the customer themselves. */
  receiver?: Contact;
};

type Phase = { key: string; label: string; detail: string; seconds: number };

/**
 * Phases are time-based so tracking keeps working after the app restarts.
 * Durations are compressed for demo purposes; in production the status comes from your backend.
 */
export const PHASES: Record<Trip['kind'], Phase[]> = {
  pabili: [
    { key: 'searching', label: 'Finding a rider', detail: 'Matching you with a nearby rider', seconds: 6 },
    { key: 'tostore', label: 'Rider heading to the store', detail: 'Your rider will order and pay for your items', seconds: 18 },
    { key: 'buying', label: 'Rider is buying your order', detail: 'Ordering at the counter — keep your phone handy', seconds: 22 },
    { key: 'onway', label: 'On the way to you', detail: 'Prepare the payment for the items and delivery fee', seconds: 30 },
    { key: 'done', label: 'Delivered', detail: 'Pay the rider the receipt amount plus the delivery fee', seconds: 0 },
  ],
  pasugo: [
    { key: 'searching', label: 'Finding a rider', detail: 'Matching you with a nearby rider', seconds: 6 },
    { key: 'topickup', label: 'Rider heading to pickup', detail: 'The rider will contact the person at the pickup point', seconds: 20 },
    { key: 'intransit', label: 'Picked up — on the way', detail: 'Heading to the drop-off point', seconds: 40 },
    { key: 'done', label: 'Delivered', detail: 'Handed over at the drop-off point', seconds: 0 },
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
  let phase = phases[index];
  if (trip.cargo === 'person' && phase.key === 'done') phase = { ...phase, label: 'Dropped off', detail: 'Your passenger has arrived safely' };
  if (trip.cargo === 'person' && phase.key === 'intransit') phase = { ...phase, label: 'Passenger on board', detail: 'Heading to the drop-off point' };
  const key = phase.key;
  const { start } = trip.rider;
  const p = trip.pickup.location;
  const d = trip.dropoff.location;

  let riderPos: LatLng | null = null;
  if (trip.kind === 'pabili') {
    // Rider goes to the store, buys the items, then delivers.
    if (key === 'searching') riderPos = null;
    else if (key === 'tostore') riderPos = lerp(start, p, t);
    else if (key === 'buying') riderPos = p;
    else if (key === 'onway') riderPos = lerp(p, d, t);
    else riderPos = d;
  } else {
    if (key === 'searching') riderPos = null;
    else if (key === 'topickup') riderPos = lerp(start, p, t);
    else if (key === 'intransit') riderPos = lerp(p, d, t);
    else riderPos = d;
  }

  return {
    index,
    phase,
    done: !trip.cancelledAt && index === phases.length - 1,
    cancelled: !!trip.cancelledAt,
    riderPos,
    secondsLeft,
  };
}

/** Customers can cancel until the rider starts buying, or until the pasugo is picked up. */
export function canCancel(trip: Trip, now = Date.now()) {
  const pr = getProgress(trip, now);
  if (pr.cancelled || pr.done) return false;
  return trip.kind === 'pabili' ? pr.phase.key === 'searching' || pr.phase.key === 'tostore' : pr.phase.key !== 'intransit';
}
