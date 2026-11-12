import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PLATES, RIDER_NAMES } from './data';
import { DEFAULT_LOCATION, LatLng, offset } from './geo';
import { Route } from './routing';
import { deliveryFee, pasugoFee, Vehicle, VEHICLES } from './pricing';
import { Cargo, Contact, ErrandItem, PaymentMethod, Stop, Trip } from './trips';
import { DriverJob } from './driver';

type Profile = { name: string; phone: string };
/** The buy-for-me order being drafted: where to buy and what to buy. */
type Errand = { store: Stop | null; storeId: string | null; items: ErrandItem[] };
export type RiderProfile = { name: string; phone: string; vehicle: Vehicle; plate: string };
type DriverState = {
  online: boolean; earnings: number; completed: number; active: DriverJob | null; history: DriverJob[]; profile: RiderProfile;
};

type State = {
  ready: boolean;
  profile: Profile;
  home: Stop;
  errand: Errand;
  trips: Trip[];
  payment: PaymentMethod;
  driver: DriverState;
  pasugoDraft: { pickup: Stop | null; dropoff: Stop | null };
};

const EMPTY_ERRAND: Errand = { store: null, storeId: null, items: [] };
const INITIAL: State = {
  ready: false,
  profile: { name: 'Guest', phone: '' },
  home: { name: 'Ayala Triangle, Makati', location: DEFAULT_LOCATION },
  errand: EMPTY_ERRAND,
  trips: [],
  payment: 'cash',
  driver: {
    online: false, earnings: 0, completed: 0, active: null, history: [],
    profile: { name: 'Rider', phone: '', vehicle: 'moto', plate: '' },
  },
  pasugoDraft: { pickup: null, dropoff: null },
};

// v5: rider jobs gained payment method and the rider share changed; older saved data is not compatible.
const KEY = 'ridego-state-v5';
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function makeRider(near: LatLng) {
  return {
    name: pick(RIDER_NAMES),
    plate: pick(PLATES),
    rating: Math.round((4.6 + Math.random() * 0.4) * 10) / 10,
    start: offset(near, 0.8 + Math.random() * 1.2, Math.random() * 360),
  };
}

/** The delivery fee is the only amount the app computes for a pabili order, from the road distance. */
export const errandFee = (route: Route) => deliveryFee(route.km);

export const errandCount = (e: Errand) => e.items.reduce((s, i) => s + i.qty, 0);

function useStoreValue() {
  const [state, setState] = useState<State>(INITIAL);
  const loaded = useRef(false);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setState({ ...INITIAL, ...JSON.parse(raw), ready: true });
        else setState((s) => ({ ...s, ready: true }));
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
      setProfile: (profile: Profile) => update(() => ({ profile })),
      setHome: (home: Stop) => update(() => ({ home })),
      setPasugoStop: (which: 'pickup' | 'dropoff', stop: Stop | null) => update((s) => ({ pasugoDraft: { ...s.pasugoDraft, [which]: stop } })),
      swapPasugoStops: () => update((s) => ({ pasugoDraft: { pickup: s.pasugoDraft.dropoff, dropoff: s.pasugoDraft.pickup } })),
      setPayment: (payment: PaymentMethod) => update(() => ({ payment })),

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

      placeErrand: (route: Route, note: string, budget?: number): string | null => {
        const s = latest.current;
        const { store, items } = s.errand;
        if (!store || !items.length) return null;
        const { km } = route;
        const fee = errandFee(route);
        const trip: Trip = {
          id: `F-${uid()}`, kind: 'pabili', createdAt: Date.now(),
          pickup: store, dropoff: s.home, km, path: route.path, distanceEstimated: route.estimated, rider: makeRider(store.location),
          payment: s.payment, lines: [{ label: `Delivery fee (${km.toFixed(1)} km)`, amount: fee }], total: fee,
          items, note, budget,
        };
        update((cur) => ({ trips: [trip, ...cur.trips], errand: EMPTY_ERRAND }));
        return trip.id;
      },

      bookPasugo: (o: {
        pickup: Stop; dropoff: Stop; route: Route; vehicle: Vehicle; cargo: Cargo; description: string; sender?: Contact; receiver?: Contact;
      }): string => {
        const id = `P-${uid()}`;
        const { km } = o.route;
        const fee = pasugoFee(km, o.vehicle);
        const trip: Trip = {
          id, kind: 'pasugo', createdAt: Date.now(), pickup: o.pickup, dropoff: o.dropoff, km,
          path: o.route.path, distanceEstimated: o.route.estimated,
          vehicle: o.vehicle, cargo: o.cargo, description: o.description, sender: o.sender, receiver: o.receiver,
          rider: makeRider(o.pickup.location), payment: latest.current.payment,
          lines: [{ label: `${VEHICLES[o.vehicle].label} pasugo (${km.toFixed(1)} km)`, amount: fee }],
          total: fee,
        };
        update((cur) => ({ trips: [trip, ...cur.trips], pasugoDraft: { pickup: null, dropoff: cur.home } }));
        return id;
      },

      cancelTrip: (id: string) => update((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, cancelledAt: Date.now() } : t)) })),
      rateTrip: (id: string, rating: number) => update((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, rating } : t)) })),

      // Rider (driver) mode
      setOnline: (online: boolean) => update((s) => ({ driver: { ...s.driver, online } })),
      setRiderProfile: (profile: RiderProfile) => update((s) => ({ driver: { ...s.driver, profile } })),
      acceptJob: (job: DriverJob) => update((s) => ({ driver: { ...s.driver, active: { ...job, stage: 0 } } })),
      /** Moves the active job to its next stage. `receipt` is what the rider paid at the store (buy-and-deliver only). */
      advanceJob: (receipt?: number) =>
        update((s) => {
          const job = s.driver.active;
          if (!job) return {};
          if (job.stage < 2) return { driver: { ...s.driver, active: { ...job, stage: job.stage + 1, receipt: receipt ?? job.receipt } } };
          return {
            driver: {
              ...s.driver,
              active: null,
              earnings: s.driver.earnings + job.payout,
              completed: s.driver.completed + 1,
              history: [{ ...job, stage: 3, completedAt: Date.now(), path: undefined }, ...s.driver.history].slice(0, 500),
            },
          };
        }),
      declineActive: () => update((s) => ({ driver: { ...s.driver, active: null } })),
      resetAll: () => setState({ ...INITIAL, ready: true }),
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

/** Re-renders every `ms` so time-based tracking stays live. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
