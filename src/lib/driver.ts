import type { Order, OrderStatus } from './api';

/** The button a rider taps to move the job to its next status. */
export function nextStepLabel(o: Pick<Order, 'kind' | 'status'>): string | null {
  const pabili = o.kind === 'pabili';
  if (o.status === 'accepted') return pabili ? 'Arrived at store' : 'Arrived at pickup';
  if (o.status === 'at_pickup') return pabili ? 'Items bought' : 'Picked up';
  if (o.status === 'picked_up') return pabili ? 'Delivered & paid' : 'Delivered';
  return null;
}

/** What the rider should be doing now. */
export const RIDER_TODO: Partial<Record<OrderStatus, Record<Order['kind'], string>>> = {
  accepted: { pabili: 'Head to the store', pasugo: 'Head to pickup point' },
  at_pickup: { pabili: 'Order and pay for the items', pasugo: 'Collect the item or passenger' },
  picked_up: { pabili: 'Deliver and collect payment', pasugo: 'Bring to the drop-off point' },
};

export type EarningsSummary = { jobs: number; fees: number; earned: number; cashFees: number; toRemit: number };

/**
 * Totals for delivered orders. With cash, the rider collects the whole fee and owes the company its part
 * (`toRemit`); with GCash or card the company collects the fee and owes the rider their share.
 */
export function summarize(orders: Order[]): EarningsSummary {
  return orders.reduce<EarningsSummary>(
    (t, o) => {
      const fee = Number(o.fee), earned = Number(o.rider_earning), cash = o.payment === 'cash';
      return {
        jobs: t.jobs + 1,
        fees: t.fees + fee,
        earned: t.earned + earned,
        cashFees: t.cashFees + (cash ? fee : 0),
        toRemit: t.toRemit + (cash ? fee - earned : 0),
      };
    },
    { jobs: 0, fees: 0, earned: 0, cashFees: 0, toRemit: 0 },
  );
}

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** Delivered orders since the start of today, or of this week (weeks start on Monday). */
export function deliveredSince(orders: Order[], period: 'today' | 'week' | 'all') {
  const done = orders.filter((o) => o.status === 'delivered' && o.delivered_at);
  if (period === 'all') return done;
  const now = new Date();
  const from = period === 'today' ? startOfDay(now) : startOfDay(now) - ((now.getDay() + 6) % 7) * 86400000;
  return done.filter((o) => new Date(o.delivered_at!).getTime() >= from);
}
