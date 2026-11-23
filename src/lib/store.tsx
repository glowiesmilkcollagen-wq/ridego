import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_LOCATION } from './geo';
import { ErrandItem, PaymentMethod, Stop } from './trips';

/**
 * What is kept only on this phone: the customer's drafts and preferences. Orders, profiles and riders live in
 * the Supabase database (see api.ts).
 */
/** One store in a pabili draft, with its own shopping list. `key` identifies it within the draft. */
export type ErrandStop = { key: string; store: Stop; storeId: string | null; items: ErrandItem[] };
/** The pabili draft: the stores in visiting order. */
type Errand = { stops: ErrandStop[] };
export const MAX_STORES = 5;
type State = {
  ready: boolean;
  home: Stop;
  /** True once the customer picked a delivery address; until then it follows the phone's location. */
  homeChosen: boolean;
  payment: PaymentMethod;
  errand: Errand;
  pasugoDraft: { pickup: Stop | null; dropoff: Stop | null };
};

const EMPTY_ERRAND: Errand = { stops: [] };
const INITIAL: State = {
  ready: false,
  home: { name: 'Ayala Triangle, Makati', location: DEFAULT_LOCATION },
  homeChosen: false,
  payment: 'cash',
  errand: EMPTY_ERRAND,
  pasugoDraft: { pickup: null, dropoff: null },
};

// v2: the pabili draft holds several stores.
const KEY = 'ridego-local-v2';
const uid = () => Math.random().toString(36).slice(2, 10);

export const errandCount = (e: Errand) => e.stops.reduce((s, st) => s + st.items.reduce((n, i) => n + i.qty, 0), 0);
/** Whether a store is already in the draft (matched by store id, or by name for places outside the store list). */
export const hasStore = (e: Errand, store: Stop, storeId: string | null) =>
  e.stops.some((st) => (storeId ? st.storeId === storeId : !st.storeId && st.store.name === store.name));

function useStoreValue() {
  const [state, setState] = useState<State>(INITIAL);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return setState((s) => ({ ...s, ready: true }));
        const saved = JSON.parse(raw);
        // Older saves have no homeChosen: an address other than the default was picked by the customer.
        const homeChosen = saved.homeChosen ?? (saved.home?.name && saved.home.name !== INITIAL.home.name);
        setState({ ...INITIAL, ...saved, homeChosen: !!homeChosen, ready: true });
      })
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
      /** The customer's own choice of delivery address. */
      setHome: (home: Stop) => update(() => ({ home, homeChosen: true })),
      /** The phone's location, used until the customer picks an address (never overrides their choice). */
      setHomeFromGps: (home: Stop) => update((s) => (s.homeChosen ? {} : { home })),
      setPayment: (payment: PaymentMethod) => update(() => ({ payment })),
      setPasugoStop: (which: 'pickup' | 'dropoff', stop: Stop | null) => update((s) => ({ pasugoDraft: { ...s.pasugoDraft, [which]: stop } })),
      swapPasugoStops: () => update((s) => ({ pasugoDraft: { pickup: s.pasugoDraft.dropoff, dropoff: s.pasugoDraft.pickup } })),
      clearPasugo: () => update((s) => ({ pasugoDraft: { pickup: null, dropoff: s.home } })),

      /** Adds a store to the pabili draft (ignored if it is already there or the draft is full). Returns its key. */
      addErrandStore: (store: Stop, storeId: string | null): string => {
        const key = uid();
        update((s) => {
          if (hasStore(s.errand, store, storeId) || s.errand.stops.length >= MAX_STORES) return {};
          return { errand: { stops: [...s.errand.stops, { key, store, storeId, items: [] }] } };
        });
        return key;
      },
      removeErrandStore: (key: string) => update((s) => ({ errand: { stops: s.errand.stops.filter((st) => st.key !== key) } })),
      addErrandItem: (stopKey: string, name: string) =>
        update((s) => {
          const clean = name.trim();
          if (!clean) return {};
          return {
            errand: {
              stops: s.errand.stops.map((st) => {
                if (st.key !== stopKey) return st;
                const existing = st.items.find((i) => i.name.toLowerCase() === clean.toLowerCase());
                const items = existing
                  ? st.items.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i))
                  : [...st.items, { id: uid(), name: clean, qty: 1 }];
                return { ...st, items };
              }),
            },
          };
        }),
      changeErrandQty: (stopKey: string, id: string, delta: number) =>
        update((s) => ({
          errand: {
            stops: s.errand.stops.map((st) =>
              st.key === stopKey ? { ...st, items: st.items.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0) } : st),
          },
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
