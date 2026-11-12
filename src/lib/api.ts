import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category, Store } from './data';
import type { LatLng } from './geo';
import { DEFAULT_PRICES, Prices, Vehicle } from './pricing';
import { supabase, supabaseConfigured } from './supabase';
import type { Cargo, Contact, ErrandItem, PaymentMethod, Stop } from './trips';

// ───────────────────────────── Row types (mirror supabase/schema.sql) ─────────────────────────────
export type Role = 'customer' | 'rider' | 'admin';
export type Profile = { id: string; role: Role; full_name: string; phone: string; created_at: string };
export type RiderStatus = 'pending' | 'approved' | 'suspended';
export type Rider = {
  id: string; status: RiderStatus; vehicle: Vehicle; plate: string; license_no: string; online: boolean;
  lat: number | null; lng: number | null; location_at: string | null; created_at: string;
};
export type OrderKind = 'pabili' | 'pasugo';
export type OrderStatus = 'searching' | 'accepted' | 'at_pickup' | 'picked_up' | 'delivered' | 'cancelled';
export type Order = {
  id: string; code: string; kind: OrderKind; status: OrderStatus;
  customer_id: string; customer_name: string; rider_id: string | null;
  pickup_name: string; pickup_lat: number; pickup_lng: number;
  dropoff_name: string; dropoff_lat: number; dropoff_lng: number;
  km: number; path: LatLng[] | null; vehicle: Vehicle;
  base_fee: number; discount: number; fee: number; promo_code: string | null;
  rider_share: number; rider_earning: number; payment: PaymentMethod;
  items: ErrandItem[] | null; note: string | null; budget: number | null; receipt_amount: number | null; store_id: string | null;
  cargo: Cargo | null; description: string | null; sender: Contact | null; receiver: Contact | null;
  rating: number | null;
  created_at: string; accepted_at: string | null; at_pickup_at: string | null; picked_up_at: string | null;
  delivered_at: string | null; cancelled_at: string | null; cancelled_by: string | null;
};
export type StoreRow = {
  id: string; name: string; tagline: string; category: Category; emoji: string; tint: string; rating: number;
  wait_minutes: number; lat: number; lng: number; address: string; favorites: string[]; active: boolean; created_at: string;
};
export type Promotion = {
  id: string; code: string; description: string; discount_type: 'percent' | 'fixed'; value: number; max_discount: number | null;
  applies_to: 'all' | OrderKind; once_per_customer: boolean; max_uses: number | null;
  starts_at: string | null; ends_at: string | null; active: boolean; created_at: string;
};
export type RiderTransaction = { id: string; rider_id: string; type: 'remittance' | 'payout'; amount: number; note: string; created_at: string };

export const ACTIVE_STATUSES: OrderStatus[] = ['accepted', 'at_pickup', 'picked_up'];
export const isOpen = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';

/** Numeric columns come back from PostgREST as numbers; coordinates in `path` are stored as {latitude, longitude}. */
export const pickupOf = (o: Order): Stop => ({ name: o.pickup_name, location: { latitude: o.pickup_lat, longitude: o.pickup_lng } });
export const dropoffOf = (o: Order): Stop => ({ name: o.dropoff_name, location: { latitude: o.dropoff_lat, longitude: o.dropoff_lng } });

export const toStore = (r: StoreRow): Store => ({
  id: r.id, name: r.name, tagline: r.tagline, category: r.category, emoji: r.emoji, tint: r.tint, rating: Number(r.rating),
  waitMinutes: r.wait_minutes, location: { latitude: r.lat, longitude: r.lng }, address: r.address, favorites: r.favorites ?? [],
});

/** Throws the Supabase error, so callers can show it. */
function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

// ───────────────────────────── Auth ─────────────────────────────
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export async function signUp(email: string, password: string, fullName: string, phone: string) {
  const data = must(await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim(), phone: phone.trim() } } }));
  if (!data.session) throw new Error('Account created. Check your email to confirm it, then log in.');
}
export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}
export async function signOut() {
  await supabase.auth.signOut();
}

/** Loads a row and keeps it fresh: refetches on demand, on realtime changes to `table`, and every `pollMs`. */
function useLive<T>(load: () => Promise<T>, deps: unknown[], opts: { table?: string; filter?: string; pollMs?: number; enabled?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;
  const enabled = opts.enabled ?? true;
  const refresh = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (!enabled || !supabaseConfigured) return;
    setLoaded(false);
    refresh();
    const timer = opts.pollMs ? setInterval(refresh, opts.pollMs) : undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    if (opts.table) {
      channel = supabase
        .channel(`live-${opts.table}-${opts.filter ?? 'all'}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: opts.table, ...(opts.filter ? { filter: opts.filter } : {}) }, () => refresh())
        .subscribe();
    }
    return () => {
      if (timer) clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refresh, opts.table, opts.filter, opts.pollMs, ...deps]);
  return { data, error, loaded, refresh, setData };
}

// ───────────────────────────── Profile, stores, prices ─────────────────────────────
export function useProfile(userId?: string) {
  return useLive<Profile | null>(
    async () => must(await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle()) as Profile | null,
    [userId],
    { enabled: !!userId },
  );
}
export async function updateProfile(id: string, fullName: string, phone: string) {
  must(await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() }).eq('id', id));
}

export function useStores() {
  const live = useLive<Store[]>(
    async () => (must(await supabase.from('stores').select('*').eq('active', true).order('category').order('name')) as StoreRow[]).map(toStore),
    [],
    { pollMs: 5 * 60_000 },
  );
  return { stores: live.data ?? [], loading: live.data === null && !live.error, error: live.error, refresh: live.refresh };
}

export function usePrices(): Prices {
  const live = useLive<Prices>(
    async () => {
      const row = must(await supabase.from('settings').select('*').eq('id', 1).maybeSingle()) as Record<string, unknown> | null;
      if (!row) return DEFAULT_PRICES;
      return Object.fromEntries(Object.keys(DEFAULT_PRICES).map((k) => [k, Number(row[k])])) as Prices;
    },
    [],
    { pollMs: 5 * 60_000 },
  );
  return live.data ?? DEFAULT_PRICES;
}

// ───────────────────────────── Customer ─────────────────────────────
export type NewOrder = {
  kind: OrderKind; pickup: Stop; dropoff: Stop; km: number; path: LatLng[] | null; payment: PaymentMethod; promo_code?: string;
  vehicle?: Vehicle; items?: ErrandItem[]; note?: string; budget?: number; store_id?: string | null;
  cargo?: Cargo; description?: string; sender?: Contact; receiver?: Contact;
};
export async function placeOrder(o: NewOrder): Promise<Order> {
  const stop = (s: Stop) => ({ name: s.name, lat: s.location.latitude, lng: s.location.longitude });
  return must(await supabase.rpc('place_order', { p: { ...o, pickup: stop(o.pickup), dropoff: stop(o.dropoff) } })) as Order;
}
export async function checkPromo(code: string, kind: OrderKind, baseFee: number) {
  const rows = must(await supabase.rpc('promo_discount', { p_code: code, p_kind: kind, p_base_fee: baseFee })) as { discount: number; description: string }[];
  return { discount: Number(rows[0]?.discount ?? 0), description: rows[0]?.description ?? '' };
}
export const cancelOrder = async (id: string) => must(await supabase.rpc('cancel_order', { p_id: id })) as Order;
export const rateOrder = async (id: string, rating: number) => must(await supabase.rpc('rate_order', { p_id: id, p_rating: rating })) as Order;

export function useMyOrders(userId?: string) {
  return useLive<Order[]>(
    async () => must(await supabase.from('orders').select('*').eq('customer_id', userId!).order('created_at', { ascending: false }).limit(50)) as Order[],
    [userId],
    { enabled: !!userId, table: 'orders', filter: `customer_id=eq.${userId}`, pollMs: 30_000 },
  );
}

/** One order with its rider (name, phone, vehicle, plate, live location while the job is active). */
export function useOrder(id?: string) {
  const order = useLive<Order | null>(
    async () => must(await supabase.from('orders').select('*').eq('id', id!).maybeSingle()) as Order | null,
    [id],
    { enabled: !!id, table: 'orders', filter: `id=eq.${id}`, pollMs: 15_000 },
  );
  const riderId = order.data?.rider_id ?? undefined;
  const rider = useLive<{ rider: Rider | null; profile: Profile | null }>(
    async () => ({
      rider: must(await supabase.from('riders').select('*').eq('id', riderId!).maybeSingle()) as Rider | null,
      profile: must(await supabase.from('profiles').select('*').eq('id', riderId!).maybeSingle()) as Profile | null,
    }),
    [riderId, order.data?.status],
    { enabled: !!riderId, table: 'riders', filter: `id=eq.${riderId}`, pollMs: 10_000 },
  );
  return { order: order.data, loading: order.data === null && !order.error, error: order.error, refresh: order.refresh, rider: rider.data?.rider ?? null, riderProfile: rider.data?.profile ?? null };
}

// ───────────────────────────── Rider ─────────────────────────────
export function useMyRider(userId?: string) {
  return useLive<Rider | null>(
    async () => must(await supabase.from('riders').select('*').eq('id', userId!).maybeSingle()) as Rider | null,
    [userId],
    { enabled: !!userId, table: 'riders', filter: `id=eq.${userId}`, pollMs: 30_000 },
  );
}
export const registerRider = async (r: { fullName: string; phone: string; vehicle: Vehicle; plate: string; licenseNo: string }) =>
  must(await supabase.rpc('rider_register', { p_full_name: r.fullName, p_phone: r.phone, p_vehicle: r.vehicle, p_plate: r.plate, p_license_no: r.licenseNo })) as Rider;
export const setOnline = async (online: boolean) => must(await supabase.rpc('rider_set_online', { p_online: online })) as Rider;
export const sendLocation = async (lat: number, lng: number) => {
  await supabase.rpc('rider_update_location', { p_lat: lat, p_lng: lng });
};
export const acceptOrder = async (id: string) => must(await supabase.rpc('accept_order', { p_id: id })) as Order;
export const advanceOrder = async (id: string, receipt?: number) => must(await supabase.rpc('advance_order', { p_id: id, p_receipt: receipt ?? null })) as Order;
export const releaseOrder = async (id: string) => must(await supabase.rpc('release_order', { p_id: id })) as Order;

/** Open jobs a rider can take (the database only returns them while the rider is approved and online). */
export function useOpenJobs(enabled: boolean) {
  return useLive<Order[]>(
    async () => must(await supabase.from('orders').select('*').eq('status', 'searching').order('created_at').limit(30)) as Order[],
    [],
    { enabled, table: 'orders', pollMs: 10_000 },
  );
}

/** The rider's own orders: the active one, plus history for earnings. */
export function useRiderOrders(userId?: string) {
  return useLive<Order[]>(
    async () => must(await supabase.from('orders').select('*').eq('rider_id', userId!).order('created_at', { ascending: false }).limit(500)) as Order[],
    [userId],
    { enabled: !!userId, table: 'orders', filter: `rider_id=eq.${userId}`, pollMs: 30_000 },
  );
}
export function useRiderMoney(userId?: string) {
  return useLive<{ balance: number; transactions: RiderTransaction[] }>(
    async () => ({
      balance: Number(must(await supabase.rpc('rider_balance', { p_rider: userId! })) ?? 0),
      transactions: must(await supabase.from('rider_transactions').select('*').eq('rider_id', userId!).order('created_at', { ascending: false })) as RiderTransaction[],
    }),
    [userId],
    { enabled: !!userId, pollMs: 60_000 },
  );
}
/** Customer contact for the rider's active job (visible once the rider has accepted it). */
export function useCustomerProfile(customerId?: string) {
  return useLive<Profile | null>(
    async () => must(await supabase.from('profiles').select('*').eq('id', customerId!).maybeSingle()) as Profile | null,
    [customerId],
    { enabled: !!customerId },
  );
}

export { useLive, must };
