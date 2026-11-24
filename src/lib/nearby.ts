import { useEffect, useMemo, useState } from 'react';
import { useStores } from './api';
import { Category, CATEGORIES, PLACES, Store } from './data';
import { distanceKm, LatLng } from './geo';
import { supabase, supabaseConfigured } from './supabase';

/** Stores shown to the customer are the ones within this distance (straight line) of the delivery address. */
export const NEARBY_KM = 3;

type Place = { id: string; name: string; address: string; lat: number; lng: number; type: string };

// Google place type → Pabili category, emoji and colour.
const TYPE_CATEGORY: Record<string, Category> = {
  restaurant: 'Food', fast_food_restaurant: 'Food', cafe: 'Food', coffee_shop: 'Food', bakery: 'Food', meal_takeaway: 'Food',
  pharmacy: 'Medicine', drugstore: 'Medicine',
  grocery_store: 'Groceries', supermarket: 'Groceries', market: 'Groceries',
  convenience_store: 'Convenience',
  hardware_store: 'Hardware', home_improvement_store: 'Hardware',
  florist: 'Gifts', gift_shop: 'Gifts',
  pet_store: 'Pets',
  department_store: 'Groceries', shopping_mall: 'Groceries',
};
const TYPE_EMOJI: Record<string, string> = { cafe: '☕', coffee_shop: '☕', bakery: '🥐', fast_food_restaurant: '🍔', florist: '💐' };
const TINT: Record<Category, string> = {
  Food: '#FFF4CC', Medicine: '#E0F7FA', Groceries: '#E8F5E9', Convenience: '#FFF3E0', Hardware: '#ECEFF1', Gifts: '#FCE4EC', Pets: '#F3E5F5',
};
const LABEL: Record<string, string> = {
  restaurant: 'Restaurant', fast_food_restaurant: 'Fast food', cafe: 'Café', coffee_shop: 'Coffee', bakery: 'Bakery', meal_takeaway: 'Takeout',
  pharmacy: 'Pharmacy', drugstore: 'Drugstore', grocery_store: 'Grocery', supermarket: 'Supermarket', market: 'Market',
  convenience_store: 'Convenience store', hardware_store: 'Hardware', home_improvement_store: 'Home & hardware',
  florist: 'Flowers', gift_shop: 'Gifts', pet_store: 'Pet shop',
  department_store: 'Department store', shopping_mall: 'Mall',
};

/**
 * Featured brands: big, well-known chains shown in "Featured stores" (Home) and the ⭐ Featured filter.
 * `key` groups the branches of one brand so only the nearest branch is featured.
 */
const FEATURED: { key: string; match: RegExp; emoji: string; category: Category }[] = [
  { key: 'jollibee', match: /jollibee/i, emoji: '🐝', category: 'Food' },
  { key: 'mcdonalds', match: /mc ?donald|mcdo\b/i, emoji: '🍟', category: 'Food' },
  { key: 'kfc', match: /\bkfc\b|kentucky fried/i, emoji: '🍗', category: 'Food' },
  { key: '7eleven', match: /7[- ]?eleven|7[- ]?11\b/i, emoji: '🏪', category: 'Convenience' },
  { key: 'rose', match: /rose pharmacy/i, emoji: '🌹', category: 'Medicine' },
  { key: 'mercury', match: /mercury drug/i, emoji: '💊', category: 'Medicine' },
  { key: '360', match: /three sixty|360 pharmacy/i, emoji: '💊', category: 'Medicine' },
  { key: 'chb', match: /cebu home (builders|& builders|and builders)|\bchb\b/i, emoji: '🔧', category: 'Hardware' },
  { key: 'citi', match: /citi ?hardware/i, emoji: '🔧', category: 'Hardware' },
  { key: 'depot', match: /home ?depot|wilcon/i, emoji: '🔧', category: 'Hardware' },
  // Malls last: a shop inside one ("Rose Pharmacy Gaisano Grand") counts as the shop's brand.
  { key: 'savemore', match: /savemore|save more/i, emoji: '🛒', category: 'Groceries' },
  { key: 'sm', match: /^sm\b|\bsm (city|supermarket|hypermarket|store|department|seaside|mall)/i, emoji: '🛍️', category: 'Groceries' },
  { key: 'ayala', match: /ayala (mall|center|centre)/i, emoji: '🛍️', category: 'Groceries' },
  { key: 'gaisano', match: /gaisano/i, emoji: '🛍️', category: 'Groceries' },
];
const brandOf = (name: string) => FEATURED.find((b) => b.match.test(name));
/** Whether a store belongs to one of the featured brands. */
export const isFeatured = (s: Store) => !!brandOf(s.name);

/** A store from Google Maps, shaped like Pabili's own stores. It is ordered like a "store not on the list". */
/** Google has hundreds of specific types (noodle_shop, asian_restaurant…): sort them by keywords. */
function categoryOf(type: string): Category {
  if (TYPE_CATEGORY[type]) return TYPE_CATEGORY[type];
  if (/pharm|drug|medical_supply|health/.test(type)) return 'Medicine';
  if (/restaurant|food|cafe|coffee|bakery|meal|noodle|donut|ice_cream|sandwich|tea|juice|dessert|pizza|burger|chicken|diner|steak|seafood|ramen|sushi|bar|grill|eatery|deli|confection/.test(type)) return 'Food';
  if (/grocery|supermarket|market|butcher|fruit|vegetable/.test(type)) return 'Groceries';
  if (/hardware|home_improvement|building|paint|electrical/.test(type)) return 'Hardware';
  if (/florist|flower|gift/.test(type)) return 'Gifts';
  if (/pet|veterinar/.test(type)) return 'Pets';
  return 'Convenience';
}
const humanize = (type: string) => (type ? type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Store');

function toStore(p: Place): Store {
  const brand = brandOf(p.name);
  const category = brand?.category ?? categoryOf(p.type);
  return {
    id: `g:${p.id}`,
    name: p.name,
    tagline: LABEL[p.type] ?? humanize(p.type),
    category,
    emoji: brand?.emoji ?? TYPE_EMOJI[p.type] ?? CATEGORIES.find((c) => c.key === category)?.emoji ?? '🏪',
    tint: TINT[category],
    rating: 0,
    waitMinutes: category === 'Food' ? 15 : 8,
    location: { latitude: p.lat, longitude: p.lng },
    address: p.address,
    favorites: [],
    source: 'google',
  };
}

// One request per ~1 km area while the app is open (the server also caches for a day).
const cache = new Map<string, Promise<Place[]>>();
function fetchPlaces(at: LatLng): Promise<Place[]> {
  const key = `${(Math.round(at.latitude / 0.01) * 0.01).toFixed(2)},${(Math.round(at.longitude / 0.01) * 0.01).toFixed(2)}`;
  let p = cache.get(key);
  if (!p) {
    p = supabase.functions
      .invoke('route', { body: { op: 'places', at: [at.latitude, at.longitude] } })
      .then(({ data, error }) => {
        if (error) throw error;
        return (data?.places ?? []) as Place[];
      })
      .catch(() => {
        cache.delete(key);
        return [];
      });
    cache.set(key, p);
  }
  return p;
}

/**
 * Stores within 3 km of `at`: Pabili's own stores plus real stores from Google Maps, nearest first.
 * `far` is how many of Pabili's own stores were left out for being farther away.
 */
export function useNearbyStores(at: LatLng) {
  const { stores, loading: ownLoading } = useStores();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const key = `${at.latitude.toFixed(4)},${at.longitude.toFixed(4)}`;

  useEffect(() => {
    if (!supabaseConfigured) return setPlaces([]);
    let live = true;
    setPlaces(null);
    fetchPlaces(at).then((p) => live && setPlaces(p));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const nearby = useMemo(() => {
    const own = stores.filter((s) => distanceKm(s.location, at) <= NEARBY_KM);
    const google = (places ?? []).map(toStore).filter((s) => distanceKm(s.location, at) <= NEARBY_KM)
      // Skip Google entries that are one of Pabili's own stores (same name close by).
      .filter((g) => !own.some((o) => o.name.toLowerCase() === g.name.toLowerCase() && distanceKm(o.location, g.location) < 0.2));
    return [...own, ...google].sort((a, b) => distanceKm(a.location, at) - distanceKm(b.location, at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, places, key]);

  return { stores: nearby, loading: ownLoading || places === null };
}

/** How a store is passed to an order: Google stores carry their address in the name, like a store not on the list. */
export const storeStop = (r: Store) =>
  r.source === 'google'
    ? { stop: { name: r.address ? `${r.name} — ${r.address}` : r.name, location: r.location }, storeId: null }
    : { stop: { name: r.name, location: r.location }, storeId: r.id };

/** Landmarks (malls, parks…) from Pabili's list that are within `km` of `at`; far-away ones would only confuse. */
export const landmarksNear = (at: LatLng, km = 15) => PLACES.filter((p) => distanceKm(p.location, at) <= km);

/** The nearest branch of each featured brand among `stores` (already sorted nearest first). */
export function featuredStores(stores: Store[]): Store[] {
  const seen = new Set<string>();
  return stores.filter((s) => {
    const b = brandOf(s.name);
    if (!b || seen.has(b.key)) return false;
    seen.add(b.key);
    return true;
  });
}
