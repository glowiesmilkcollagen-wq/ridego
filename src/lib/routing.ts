import { useEffect, useState } from 'react';
import type { Store } from './data';
import { LatLng, roadKm } from './geo';
import { supabase, supabaseConfigured } from './supabase';

/**
 * Road routing. The apps ask the `route` Edge Function (supabase/functions/route), which uses Google's Routes API
 * once the GOOGLE_MAPS_API_KEY secret is set on Supabase (the key never ships in the apps) and caches answers.
 * If that can't be reached (offline, signed out), the apps ask the free OSRM demo server directly, and failing
 * that use a straight-line estimate.
 */
export const ROUTING_URL = 'https://router.project-osrm.org';

export type Route = {
  km: number;
  /** Points along the road, for drawing the route and moving the rider along it. */
  path: LatLng[];
  /** True when the routing server could not be reached and distance is a straight-line estimate. */
  estimated: boolean;
};

const MAX_PATH_POINTS = 250;
const routeCache = new Map<string, Promise<Route>>();
const tableCache = new Map<string, Promise<Record<string, number>>>();
const pt = (p: LatLng) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`;

async function fetchJson(url: string, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 'Ok') throw new Error(json.code);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

type FnPoint = [number, number];
const fnPt = (p: LatLng): FnPoint => [p.latitude, p.longitude];

/** Calls the `route` Edge Function; throws on any failure so callers can fall back. */
async function callRouteFn<T>(body: object, ms = 10000): Promise<T> {
  if (!supabaseConfigured) throw new Error('not configured');
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('signed out');
  const res = await Promise.race([
    supabase.functions.invoke('route', { body }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
  if (res.error || !res.data || (res.data as { error?: string }).error) throw res.error ?? new Error('route failed');
  return res.data as T;
}

/** Keeps at most `max` evenly spaced points (always including both ends) so trips stay small when saved. */
function thin(path: LatLng[], max = MAX_PATH_POINTS) {
  if (path.length <= max) return path;
  const step = (path.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => path[Math.round(i * step)]);
}

export function estimateRoute(a: LatLng, b: LatLng): Route {
  return estimateRouteVia([a, b]);
}
export function estimateRouteVia(points: LatLng[]): Route {
  const km = points.slice(1).reduce((s, p, i) => s + roadKm(points[i], p), 0);
  return { km, path: points, estimated: true };
}

/** The road route from `a` to `b`. */
export const getRoute = (a: LatLng, b: LatLng) => getRouteVia([a, b]);

/** The road route through `points` in order (e.g. store 1 → store 2 → customer). Falls back to an estimate when offline; failures are not cached. */
export function getRouteVia(points: LatLng[]): Promise<Route> {
  const key = points.map(pt).join(';');
  let p = routeCache.get(key);
  if (!p) {
    p = callRouteFn<{ km: number; path: FnPoint[] }>({ op: 'route', points: points.map(fnPt) })
      .then((r): Route => {
        const path = r.path.map(([latitude, longitude]) => ({ latitude, longitude }));
        return { km: r.km, path: path.length >= 2 ? thin(path) : points, estimated: false };
      })
      .catch(() =>
        fetchJson(`${ROUTING_URL}/route/v1/driving/${key}?overview=full&geometries=geojson`).then((json): Route => {
          const r = json.routes[0];
          const path = (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
          return { km: r.distance / 1000, path: thin(path), estimated: false };
        }),
      )
      .catch(() => {
        routeCache.delete(key);
        return estimateRouteVia(points);
      });
    routeCache.set(key, p);
  }
  return p;
}

/** Road distance in km from every store to `dest`, in one request. Missing entries fall back to estimates. */
export function getStoreDistances(stores: Store[], dest: LatLng): Promise<Record<string, number>> {
  const key = `${pt(dest)}|${stores.map((s) => s.id).join(',')}`;
  let p = tableCache.get(key);
  if (!p) {
    const coords = [...stores.map((s) => pt(s.location)), pt(dest)].join(';');
    const sources = stores.map((_, i) => i).join(';');
    const toMap = (kms: (number | null | undefined)[]) => {
      const out: Record<string, number> = {};
      stores.forEach((s, i) => {
        if (typeof kms[i] === 'number') out[s.id] = kms[i] as number;
      });
      return out;
    };
    p = callRouteFn<{ km: (number | null)[] }>({ op: 'matrix', origins: stores.map((s) => fnPt(s.location)), dest: fnPt(dest) })
      .then((r) => toMap(r.km))
      .catch(() =>
        fetchJson(`${ROUTING_URL}/table/v1/driving/${coords}?sources=${sources}&destinations=${stores.length}&annotations=distance`).then(
          (json) => toMap(stores.map((_, i) => (typeof json.distances?.[i]?.[0] === 'number' ? json.distances[i][0] / 1000 : null))),
        ),
      )
      .catch(() => {
        tableCache.delete(key);
        return {};
      });
    tableCache.set(key, p);
  }
  return p;
}

/** Loads the road route between two points; `route` is null while loading or when a point is missing. */
export function useRoute(a?: LatLng | null, b?: LatLng | null) {
  return useRouteVia([a, b]);
}

/** Loads the road route through several points in order; null while loading or when any point is missing. */
export function useRouteVia(points: (LatLng | null | undefined)[]) {
  const [route, setRoute] = useState<Route | null>(null);
  const ready = points.length >= 2 && points.every(Boolean);
  const key = ready ? (points as LatLng[]).map(pt).join(';') : '';
  useEffect(() => {
    if (!ready) return setRoute(null);
    let live = true;
    setRoute(null);
    getRouteVia(points as LatLng[]).then((r) => live && setRoute(r));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { route, loading: !!key && !route };
}

/** Road distance in km from each store to `dest`; uses an estimate for any store not yet known. */
export function useStoreDistances(stores: Store[], dest: LatLng) {
  const [kms, setKms] = useState<Record<string, number>>({});
  const key = `${pt(dest)}|${stores.map((s) => s.id).join(',')}`;
  useEffect(() => {
    if (!stores.length) return;
    let live = true;
    getStoreDistances(stores, dest).then((r) => live && setKms(r));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (store: Store) => kms[store.id] ?? roadKm(store.location, dest);
}
