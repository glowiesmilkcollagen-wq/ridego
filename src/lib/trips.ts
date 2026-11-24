import type { Order, OrderStatus } from './api';
import type { LatLng } from './geo';

export type Stop = { name: string; location: LatLng };
export type Contact = { name: string; phone: string };
/** One line of a pabili shopping list. No price: the rider pays at the store. */
export type ErrandItem = { id: string; name: string; qty: number };

/** What a pasugo rider picks up. No passengers: motorcycle taxi service needs LTFRB permits. */
export type Cargo = 'document' | 'parcel';
export const CARGO: Record<Cargo, { label: string; icon: string; emoji: string; example: string }> = {
  document: { label: 'Document / folder', icon: 'file-document-outline', emoji: '📁', example: 'e.g. Blue folder with signed contracts' },
  parcel: { label: 'Bag / package', icon: 'shopping-outline', emoji: '🛍️', example: 'e.g. Plastic bag with clothes, about 3 kg' },
};

/** The cargo details for an order; anything unknown (e.g. old passenger orders) shows as a package. */
export const cargoOf = (o: { cargo?: string | null }) => CARGO[o.cargo as Cargo] ?? CARGO.parcel;

export type PaymentMethod = 'cash' | 'gcash' | 'card';
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: 'Cash', gcash: 'GCash', card: 'Credit / Debit card' };

/** The steps shown on the customer's progress bar. */
export const STEPS: OrderStatus[] = ['searching', 'accepted', 'at_pickup', 'picked_up', 'delivered'];

/** What to tell the customer for an order's current status. */
export function statusText(o: Pick<Order, 'kind' | 'status' | 'cargo' | 'cancelled_by'>): { label: string; detail: string } {
  const pabili = o.kind === 'pabili';
  switch (o.status) {
    case 'searching': return { label: 'Finding a rider', detail: 'Matching you with a nearby rider' };
    case 'accepted': return pabili
      ? { label: 'Rider heading to the store', detail: 'Your rider will order and pay for your items' }
      : { label: 'Rider heading to pickup', detail: 'The rider will contact the person at the pickup point' };
    case 'at_pickup': return pabili
      ? { label: 'Rider is buying your order', detail: 'Ordering at the counter — keep your phone handy' }
      : { label: 'Rider at the pickup', detail: 'Collecting the item' };
    case 'picked_up': return pabili
      ? { label: 'On the way to you', detail: 'Prepare the payment for the items and the driver fee' }
      : { label: 'Picked up — on the way', detail: 'Heading to the drop-off point' };
    case 'delivered': return pabili
      ? { label: 'Delivered', detail: 'Paid the rider for the items and the driver fee' }
      : { label: 'Delivered', detail: 'Handed over at the drop-off point' };
    case 'cancelled': return { label: 'Cancelled', detail: o.cancelled_by === 'admin' ? 'Cancelled by Pabili support. No charge was made.' : 'No charge was made.' };
  }
}

/** Customers can cancel until the rider arrives at the store or pickup (the server enforces the same rule). */
export const canCustomerCancel = (o: Pick<Order, 'status'>) => o.status === 'searching' || o.status === 'accepted';
