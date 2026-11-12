import { PLACES, STORES } from './data';
import { LatLng, roadKm } from './geo';
import { getRoute } from './routing';
import { deliveryFee, pasugoFee, RIDER_SHARE } from './pricing';
import { Cargo, CARGO } from './trips';

export type DriverJob = {
  id: string;
  kind: 'pabili' | 'pasugo';
  cargo?: Cargo;
  pickup: { name: string; location: LatLng };
  dropoff: { name: string; location: LatLng };
  km: number;
  /** Road route from pickup to drop-off, once loaded. */
  path?: LatLng[];
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
  pabili: ['Arrived at store', 'Items bought', 'Delivered & paid'],
  pasugo: ['Arrived at pickup', 'Picked up', 'Delivered'],
};
export const STAGE_STATUS: Record<DriverJob['kind'], string[]> = {
  pabili: ['Head to the store', 'Order and pay for the items', 'Deliver and collect payment'],
  pasugo: ['Head to pickup point', 'Collect the item or passenger', 'Bring to the drop-off point'],
};

/** Generates mock incoming requests. In production these arrive from your dispatch backend. */
export function generateJobs(count = 4): DriverJob[] {
  return Array.from({ length: count }, (_, i) => {
    const pabili = Math.random() < 0.5;
    const drop = pick(PLACES);
    if (pabili) {
      const r = pick(STORES);
      const km = roadKm(r.location, drop.location);
      const items = [...r.favorites].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
      return {
        id: `J-${Date.now().toString(36)}-${i}`, kind: 'pabili', km, stage: 0, createdAt: Date.now(),
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
    const cargo = pick<Cargo>(['document', 'parcel', 'person']);
    return {
      id: `J-${Date.now().toString(36)}-${i}`, kind: 'pasugo', cargo, km, stage: 0, createdAt: Date.now(),
      pickup: { name: `${from.name}, ${from.area}`, location: from.location },
      dropoff: { name: `${drop.name}, ${drop.area}`, location: drop.location },
      fee: pasugoFee(km, 'moto'),
      payout: Math.round(pasugoFee(km, 'moto') * RIDER_SHARE),
      customer: pick(CUSTOMERS),
      detail: CARGO[cargo].label,
    };
  });
}

/** Replaces a job's estimated distance and pay with the real road route. */
export async function withRoadRoute(job: DriverJob): Promise<DriverJob> {
  const route = await getRoute(job.pickup.location, job.dropoff.location);
  if (route.estimated) return job;
  const fee = job.kind === 'pabili' ? deliveryFee(route.km) : pasugoFee(route.km, 'moto');
  return { ...job, km: route.km, path: route.path, fee, payout: Math.round(fee * RIDER_SHARE) };
}
