import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Category, Store } from './data';
import type { LatLng } from './geo';
import { DEFAULT_PRICES, parsePrices, Prices, Vehicle } from './pricing';
import { supabase, supabaseConfigured } from './supabase';
import { unregisterPush } from './push';
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
  base_fee: number; discount: number; booking_fee: number; fee: number; promo_code: string | null;
  rider_share: number; rider_earning: number; commission_waived: boolean; payment: PaymentMethod;
  items: ErrandItem[] | null; note: string | null; budget: number | null; receipt_amount: number | null; store_id: string | null;
  stops: OrderStop[] | null; store_count: number;
  cargo: Cargo | null; description: string | null; sender: Contact | null; receiver: Contact | null;
  rating: number | null;
  created_at: string; accepted_at: string | null; at_pickup_at: string | null; picked_up_at: string | null;
  delivered_at: string | null; cancelled_at: string | null; cancelled_by: string | null;
};
/** One store in a pabili order, with its own shopping list. */
export type OrderStop = { name: string; lat: number; lng: number; store_id: string | null; items: ErrandItem[] };

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
/** The stores of a pabili order in visiting order (single-store and older orders give one stop). */
export const stopsOf = (o: Order): OrderStop[] =>
  o.stops?.length ? o.stops : [{ name: o.pickup_name, lat: o.pickup_lat, lng: o.pickup_lng, store_id: o.store_id, items: o.items ?? [] }];
/** "Crispy Coop" or "Crispy Coop + 2 more stores". */
export const storesLabel = (o: Order) => {
  const n = stopsOf(o).length;
  return n > 1 ? `${o.pickup_name} + ${n - 1} more store${n > 2 ? 's' : ''}` : o.pickup_name;
};
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
  await unregisterPush().catch(() => {});
  await supabase.auth.signOut();
}

/** Emails a 6-digit password reset code (the Supabase "Reset password" email template must include {{ .Token }}). */
export async function sendPasswordResetCode(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw error;
}
/** Checks the emailed code and sets the new password (this also logs the user in). */
export async function resetPasswordWithCode(email: string, code: string, newPassword: string) {
  if (newPassword.length < 6) throw new Error('Password should be at least 6 characters.');
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'That code is wrong or has expired. Request a new one.' : error.message);
  const { error: e2 } = await supabase.auth.updateUser({ password: newPassword });
  if (e2) throw e2;
}

/** Permanently deletes the signed-in user's account (server checks for open orders and rider balances), then logs out. */
export async function deleteMyAccount() {
  must(await supabase.rpc('delete_my_account'));
  await supabase.auth.signOut({ scope: 'local' });
}

type LiveOpts = {
  /** Realtime: reload when rows of this table change (rows the user may see, matching `filter`). */
  table?: string;
  filter?: string;
  /** Safety-net reload interval while realtime is NOT connected. */
  pollMs?: number;
  /** Reload interval while realtime IS connected (default: 4 × pollMs, since changes arrive instantly). */
  livePollMs?: number;
  enabled?: boolean;
};

/**
 * Loads data and keeps it fresh with as little traffic as possible:
 * - reloads on realtime changes (bursts are combined into one reload),
 * - polls only as a safety net — slowly while realtime is connected, faster if it drops,
 * - stops polling while the app is in the background and reloads when it comes back.
 */
function useLive<T>(load: () => Promise<T>, deps: unknown[], opts: LiveOpts = {}) {
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
    let realtime = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const foreground = () => AppState.currentState === 'active' || Platform.OS === 'web';
    const schedule = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (!foreground()) return;
      const ms = realtime ? opts.livePollMs ?? (opts.pollMs ? opts.pollMs * 4 : undefined) : opts.pollMs;
      if (ms) timer = setInterval(refresh, ms);
    };
    const soon = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(refresh, 300);
    };
    schedule();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    if (opts.table) {
      channel = supabase
        .channel(`live-${opts.table}-${opts.filter ?? 'all'}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: opts.table, ...(opts.filter ? { filter: opts.filter } : {}) }, soon)
        .subscribe((status) => {
          const was = realtime;
          realtime = status === 'SUBSCRIBED';
          if (was !== realtime) {
            schedule();
            if (realtime) soon(); // catch up on anything missed while connecting
          }
        });
    }
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        schedule();
      } else if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    });
    return () => {
      if (timer) clearInterval(timer);
      if (pending) clearTimeout(pending);
      appState.remove();
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refresh, opts.table, opts.filter, opts.pollMs, opts.livePollMs, ...deps]);
  return { data, error, loaded, refresh, setData };
}

/** Data every screen shares (stores, prices): loaded once for the whole app and refreshed when older than `ttlMs`. */
type SharedEntry<T> = { data?: T; error?: unknown; at: number; inflight?: Promise<void>; subs: Set<() => void> };
const shared = new Map<string, SharedEntry<unknown>>();
function useShared<T>(key: string, load: () => Promise<T>, ttlMs: number) {
  let entry = shared.get(key) as SharedEntry<T> | undefined;
  if (!entry) {
    entry = { at: 0, subs: new Set() };
    shared.set(key, entry as SharedEntry<unknown>);
  }
  const e = entry;
  const [, rerender] = useState(0);
  const fetchNow = useCallback(() => {
    if (e.inflight) return e.inflight;
    e.inflight = load()
      .then((d) => { e.data = d; e.error = undefined; e.at = Date.now(); })
      .catch((err) => { e.error = err; })
      .finally(() => { e.inflight = undefined; e.subs.forEach((f) => f()); });
    return e.inflight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!supabaseConfigured) return;
    const sub = () => rerender((n) => n + 1);
    e.subs.add(sub);
    const ifStale = () => { if (Date.now() - e.at > ttlMs && (AppState.currentState === 'active' || Platform.OS === 'web')) fetchNow(); };
    ifStale();
    const t = setInterval(ifStale, Math.min(ttlMs, 60_000));
    return () => { e.subs.delete(sub); clearInterval(t); };
  }, [e, fetchNow, ttlMs]);
  return { data: e.data ?? null, error: e.error, loaded: e.data !== undefined || e.error !== undefined, refresh: fetchNow };
}

// ───────────────────────────── Saved addresses ─────────────────────────────
/** A place the customer pinned and saved (up to 20; saving a 21st replaces the least used one). */
export type SavedAddress = {
  id: string; label: string; details: string; lat: number; lng: number; use_count: number; last_used_at: string; created_at: string;
};
export const MAX_SAVED_ADDRESSES = 20;
/** How an address appears on orders: "Home · Blk 5 Lot 2, Mabini St" (the rider sees this). */
export const addressText = (a: { label: string; details: string }) => (a.label.trim() ? `${a.label.trim()} · ${a.details.trim()}` : a.details.trim());
export const addressStop = (a: SavedAddress) => ({ name: addressText(a), location: { latitude: a.lat, longitude: a.lng } });

/** The signed-in customer's saved addresses, most used first. */
export function useSavedAddresses(userId?: string | null) {
  const live = useShared<SavedAddress[]>(
    `addresses:${userId ?? 'none'}`,
    async () => (userId ? (must(await supabase.from('saved_addresses').select('*').order('use_count', { ascending: false }).order('last_used_at', { ascending: false })) as SavedAddress[]) : []),
    10 * 60_000,
  );
  return { addresses: live.data ?? [], loading: !live.loaded, refresh: live.refresh };
}
export async function saveAddress(label: string, details: string, lat: number, lng: number): Promise<SavedAddress> {
  return must(await supabase.rpc('save_address', { p_label: label, p_details: details, p_lat: lat, p_lng: lng })) as SavedAddress;
}
/** Counts a use, so often-used addresses stay at the top and are never the one replaced. */
export async function markAddressUsed(id: string) {
  await supabase.rpc('use_address', { p_id: id });
}
export async function deleteAddress(id: string) {
  must(await supabase.from('saved_addresses').delete().eq('id', id));
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
  const live = useShared<Store[]>(
    'stores',
    async () => (must(await supabase.from('stores').select('*').eq('active', true).order('category').order('name')) as StoreRow[]).map(toStore),
    5 * 60_000,
  );
  return { stores: live.data ?? [], loading: !live.loaded, error: live.error, refresh: live.refresh };
}

export function usePrices(): Prices {
  const live = useShared<Prices>(
    'prices',
    async () => parsePrices(must(await supabase.from('settings').select('*').eq('id', 1).maybeSingle()) as Record<string, unknown> | null),
    5 * 60_000,
  );
  return live.data ?? DEFAULT_PRICES;
}

// ───────────────────────────── Customer ─────────────────────────────
export type NewOrder = {
  kind: OrderKind; pickup: Stop; dropoff: Stop; km: number; path: LatLng[] | null; payment: PaymentMethod; promo_code?: string;
  vehicle?: Vehicle; items?: ErrandItem[]; note?: string; budget?: number; store_id?: string | null;
  /** Pabili: the stores in visiting order, each with its items. The first is also `pickup`. */
  stops?: OrderStop[];
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
/** For a rider carrying one order: waiting jobs that are on the way and have no free rider near (max 2 orders). */
export function useSecondJobs(enabled: boolean) {
  return useLive<Order[]>(
    async () => must(await supabase.rpc('my_second_jobs')) as Order[],
    [],
    { enabled, table: 'orders', filter: 'status=eq.searching', pollMs: 20_000, livePollMs: 20_000 },
  );
}

export function useOpenJobs(enabled: boolean) {
  return useLive<Order[]>(
    async () => must(await supabase.from('orders').select('*').eq('status', 'searching').order('created_at').limit(30)) as Order[],
    [],
    // Realtime only for orders waiting for a rider. A job taken by another rider sends this rider no event
    // (it is no longer visible to them), so keep a 15-second safety net even while realtime is connected.
    { enabled, table: 'orders', filter: 'status=eq.searching', pollMs: 15_000, livePollMs: 15_000 },
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
