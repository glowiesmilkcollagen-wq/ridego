import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { findRestaurant, PLATES, RIDER_NAMES } from './data';
import { DEFAULT_LOCATION, LatLng, offset, roadKm } from './geo';
import { deliveryFee, RideType, rideFare, RIDE_TYPES, SERVICE_FEE_RATE } from './pricing';
import { CartLine, PaymentMethod, Stop, Trip } from './trips';
import { DriverJob } from './driver';

type Profile = { name: string; phone: string };
type Cart = { restaurantId: string | null; lines: CartLine[] };
type DriverState = { online: boolean; earnings: number; completed: number; active: DriverJob | null; history: DriverJob[] };

type State = {
  ready: boolean;
  profile: Profile;
  home: Stop;
  cart: Cart;
  trips: Trip[];
  payment: PaymentMethod;
  driver: DriverState;
  rideDraft: { pickup: Stop | null; dropoff: Stop | null };
};

const EMPTY_CART: Cart = { restaurantId: null, lines: [] };
const INITIAL: State = {
  ready: false,
  profile: { name: 'Guest', phone: '' },
  home: { name: 'Ayala Triangle, Makati', location: DEFAULT_LOCATION },
  cart: EMPTY_CART,
  trips: [],
  payment: 'cash',
  driver: { online: false, earnings: 0, completed: 0, active: null, history: [] },
  rideDraft: { pickup: null, dropoff: null },
};

const KEY = 'ridego-state-v1';
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

export function cartTotals(cart: Cart, home: Stop) {
  const r = cart.restaurantId ? findRestaurant(cart.restaurantId) : undefined;
  const subtotal = cart.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const km = r ? roadKm(r.location, home.location) : 0;
  const fee = r ? deliveryFee(km) : 0;
  const freeDelivery = r?.promo?.startsWith('Free delivery') && subtotal >= 399;
  const service = Math.round(subtotal * SERVICE_FEE_RATE);
  const discount = r?.promo?.startsWith('20% off') ? Math.round(subtotal * 0.2) : 0;
  const lines = [
    { label: 'Subtotal', amount: subtotal },
    { label: 'Delivery fee', amount: freeDelivery ? 0 : fee },
    { label: 'Service fee', amount: service },
    ...(discount ? [{ label: 'Promo discount', amount: -discount }] : []),
  ];
  return { restaurant: r, subtotal, km, lines, total: lines.reduce((s, l) => s + l.amount, 0), count: cart.lines.reduce((s, l) => s + l.qty, 0) };
}

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
      setRideStop: (which: 'pickup' | 'dropoff', stop: Stop | null) => update((s) => ({ rideDraft: { ...s.rideDraft, [which]: stop } })),
      swapRideStops: () => update((s) => ({ rideDraft: { pickup: s.rideDraft.dropoff, dropoff: s.rideDraft.pickup } })),
      setPayment: (payment: PaymentMethod) => update(() => ({ payment })),

      addToCart: (restaurantId: string, line: Omit<CartLine, 'qty'>) =>
        update((s) => {
          const cart = s.cart.restaurantId === restaurantId ? s.cart : { restaurantId, lines: [] };
          const existing = cart.lines.find((l) => l.itemId === line.itemId);
          const lines = existing
            ? cart.lines.map((l) => (l.itemId === line.itemId ? { ...l, qty: l.qty + 1 } : l))
            : [...cart.lines, { ...line, qty: 1 }];
          return { cart: { restaurantId, lines } };
        }),
      changeQty: (itemId: string, delta: number) =>
        update((s) => {
          const lines = s.cart.lines.map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0);
          return { cart: lines.length ? { ...s.cart, lines } : EMPTY_CART };
        }),
      clearCart: () => update(() => ({ cart: EMPTY_CART })),

      placeFoodOrder: (note: string): string | null => {
        const s = latest.current;
        const t = cartTotals(s.cart, s.home);
        if (!t.restaurant || !t.count) return null;
        const trip: Trip = {
          id: `F-${uid()}`, kind: 'food', createdAt: Date.now(),
          pickup: { name: t.restaurant.name, location: t.restaurant.location },
          dropoff: s.home, km: t.km, rider: makeRider(t.restaurant.location),
          payment: s.payment, lines: t.lines, total: t.total,
          restaurantId: t.restaurant.id, items: s.cart.lines, note,
        };
        update((cur) => ({ trips: [trip, ...cur.trips], cart: EMPTY_CART }));
        return trip.id;
      },

      bookRide: (pickup: Stop, dropoff: Stop, rideType: RideType): string => {
        const id = `R-${uid()}`;
        setState((s) => {
          const km = roadKm(pickup.location, dropoff.location);
          const fare = rideFare(km, rideType);
          const trip: Trip = {
            id, kind: 'ride', createdAt: Date.now(), pickup, dropoff, km, rideType,
            rider: makeRider(pickup.location), payment: s.payment,
            lines: [{ label: `${RIDE_TYPES[rideType].label} fare (${km.toFixed(1)} km)`, amount: fare }],
            total: fare,
          };
          return { ...s, trips: [trip, ...s.trips] };
        });
        return id;
      },

      cancelTrip: (id: string) => update((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, cancelledAt: Date.now() } : t)) })),
      rateTrip: (id: string, rating: number) => update((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, rating } : t)) })),

      // Rider (driver) mode
      setOnline: (online: boolean) => update((s) => ({ driver: { ...s.driver, online } })),
      acceptJob: (job: DriverJob) => update((s) => ({ driver: { ...s.driver, active: { ...job, stage: 0 } } })),
      advanceJob: () =>
        update((s) => {
          const job = s.driver.active;
          if (!job) return {};
          if (job.stage < 2) return { driver: { ...s.driver, active: { ...job, stage: job.stage + 1 } } };
          return {
            driver: {
              ...s.driver,
              active: null,
              earnings: s.driver.earnings + job.payout,
              completed: s.driver.completed + 1,
              history: [{ ...job, stage: 3, completedAt: Date.now() }, ...s.driver.history].slice(0, 50),
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
