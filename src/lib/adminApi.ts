import { must, Order, Profile, Promotion, Rider, RiderStatus, RiderTransaction, StoreRow, useLive } from './api';
import { parsePrices, Prices } from './pricing';
import { supabase } from './supabase';

/** Admin-only data access. The database lets these through only for profiles with role 'admin'. */

export type RiderWithProfile = Rider & { profile: Pick<Profile, 'full_name' | 'phone'> | null; email?: string | null };

export function useAllOrders(days: number) {
  return useLive<Order[]>(
    async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      return must(await supabase.from('orders').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(5000)) as Order[];
    },
    [days],
    { table: 'orders', pollMs: 30_000 },
  );
}

export function useRiders() {
  return useLive<RiderWithProfile[]>(
    async () => {
      const [riders, emails] = await Promise.all([
        supabase.from('riders').select('*, profile:profiles(full_name, phone)').order('created_at', { ascending: false }),
        supabase.rpc('admin_rider_emails'),
      ]);
      const byId = new Map(((emails.data ?? []) as { id: string; email: string }[]).map((e) => [e.id, e.email]));
      return (must(riders) as RiderWithProfile[]).map((r) => ({ ...r, email: byId.get(r.id) ?? null }));
    },
    [],
    { table: 'riders', pollMs: 30_000 },
  );
}

/** Emails the rider a 6-digit code to set a new password in the app (passwords themselves can never be read). */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
export async function setRiderStatus(id: string, status: RiderStatus) {
  must(await supabase.from('riders').update({ status, ...(status === 'approved' ? {} : { online: false }) }).eq('id', id));
}

export function useAllStores() {
  return useLive<StoreRow[]>(async () => must(await supabase.from('stores').select('*').order('category').order('name')) as StoreRow[], [], {});
}
export type StoreInput = Omit<StoreRow, 'id' | 'created_at'>;
export async function saveStore(id: string | null, s: StoreInput) {
  if (id) must(await supabase.from('stores').update(s).eq('id', id));
  else must(await supabase.from('stores').insert(s));
}
export async function deleteStore(id: string) {
  must(await supabase.from('stores').delete().eq('id', id));
}

export async function loadSettings(): Promise<Prices & { updated_at?: string }> {
  const row = must(await supabase.from('settings').select('*').eq('id', 1).maybeSingle()) as Record<string, unknown> | null;
  return { ...parsePrices(row), updated_at: row ? String(row.updated_at) : undefined };
}
export async function saveSettings(p: Prices) {
  must(await supabase.from('settings').update({ ...p, updated_at: new Date().toISOString() }).eq('id', 1));
}

export function usePromotions() {
  return useLive<Promotion[]>(async () => must(await supabase.from('promotions').select('*').order('created_at', { ascending: false })) as Promotion[], [], {});
}
export type PromoInput = Omit<Promotion, 'id' | 'created_at'>;
export async function savePromotion(id: string | null, p: PromoInput) {
  if (id) must(await supabase.from('promotions').update(p).eq('id', id));
  else must(await supabase.from('promotions').insert(p));
}
export async function deletePromotion(id: string) {
  must(await supabase.from('promotions').delete().eq('id', id));
}

/** Each rider's balance (positive: rider owes the company) and the remittance/payout history. */
export function useRiderMoneyAll(riderIds: string[]) {
  return useLive<{ balances: Record<string, number>; transactions: RiderTransaction[] }>(
    async () => {
      const balances: Record<string, number> = {};
      await Promise.all(riderIds.map(async (id) => {
        balances[id] = Number(must(await supabase.rpc('rider_balance', { p_rider: id })) ?? 0);
      }));
      const transactions = must(await supabase.from('rider_transactions').select('*').order('created_at', { ascending: false }).limit(200)) as RiderTransaction[];
      return { balances, transactions };
    },
    [riderIds.join(',')],
    { enabled: riderIds.length > 0, table: 'rider_transactions' },
  );
}
export async function recordTransaction(riderId: string, type: 'remittance' | 'payout', amount: number, note: string) {
  must(await supabase.from('rider_transactions').insert({ rider_id: riderId, type, amount, note }));
}
export const adminCancelOrder = async (id: string) => must(await supabase.rpc('cancel_order', { p_id: id })) as Order;
