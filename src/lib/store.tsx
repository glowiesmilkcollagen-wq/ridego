import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_LOCATION } from './geo';
import { ErrandItem, PaymentMethod, Stop } from './trips';

/**
 * What is kept only on this phone: the customer's drafts and preferences. Orders, profiles and riders live in
 * the Supabase database (see api.ts).
 */
type Errand = { store: Stop | null; storeId: string | null; items: ErrandItem[] };
type State = {
  ready: boolean;
  home: Stop;
  payment: PaymentMethod;
  errand: Errand;
  pasugoDraft: { pickup: Stop | null; dropoff: Stop | null };
};

const EMPTY_ERRAND: Errand = { store: null, storeId: null, items: [] };
const INITIAL: State = {
  ready: false,
  home: { name: 'Ayala Triangle, Makati', location: DEFAULT_LOCATION },
  payment: 'cash',
  errand: EMPTY_ERRAND,
  pasugoDraft: { pickup: null, dropoff: null },
};

const KEY = 'ridego-local-v1';
const uid = () => Math.random().toString(36).slice(2, 10);

export const errandCount = (e: Errand) => e.items.reduce((s, i) => s + i.qty, 0);

function useStoreValue() {
  const [state, setState] = useState<State>(INITIAL);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setState(raw ? { ...INITIAL, ...JSON.parse(raw), ready: true } : (s) => ({ ...s, ready: true })))
      .catch(() => setState((s) => ({ ...s, ready: true })))
      .finally(() => (loaded.current = true));
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const { ready, ...rest } = state;
    AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => {});
  }, [state]);

  const update = useCallback((fn: (s: State) => Partial<State>) => setState((s) => ({ ...s, ...fn(s) })), []);

  const actions = useMemo(
    () => ({
      setHome: (home: Stop) => update(() => ({ home })),
      setPayment: (payment: PaymentMethod) => update(() => ({ payment })),
      setPasugoStop: (which: 'pickup' | 'dropoff', stop: Stop | null) => update((s) => ({ pasugoDraft: { ...s.pasugoDraft, [which]: stop } })),
      swapPasugoStops: () => update((s) => ({ pasugoDraft: { pickup: s.pasugoDraft.dropoff, dropoff: s.pasugoDraft.pickup } })),
      clearPasugo: () => update((s) => ({ pasugoDraft: { pickup: null, dropoff: s.home } })),

      setErrandStore: (store: Stop, storeId: string | null) =>
        update((s) => ({ errand: { store, storeId, items: s.errand.storeId === storeId && storeId ? s.errand.items : [] } })),
      addErrandItem: (name: string) =>
        update((s) => {
          const clean = name.trim();
          if (!clean) return {};
          const existing = s.errand.items.find((i) => i.name.toLowerCase() === clean.toLowerCase());
          const items = existing
            ? s.errand.items.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i))
            : [...s.errand.items, { id: uid(), name: clean, qty: 1 }];
          return { errand: { ...s.errand, items } };
        }),
      changeErrandQty: (id: string, delta: number) =>
        update((s) => ({
          errand: { ...s.errand, items: s.errand.items.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0) },
        })),
      clearErrand: () => update(() => ({ errand: EMPTY_ERRAND })),
    }),
    [update],
  );

  return { state, ...actions };
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}

/** Re-renders every `ms` (for clocks and countdowns). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
