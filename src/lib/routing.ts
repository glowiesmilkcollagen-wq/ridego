import { useEffect, useState } from 'react';
import type { Store } from './data';
import { LatLng, roadKm } from './geo';

/**
 * Road routing via OSRM (OpenStreetMap data). The public demo server is free and needs no key, but it is
 * meant for testing: before launch, point this at your own OSRM server or switch to a paid routing API.
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

/** Keeps at most `max` evenly spaced points (always including both ends) so trips stay small when saved. */
function thin(path: LatLng[], max = MAX_PATH_POINTS) {
  if (path.length <= max) return path;
  const step = (path.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => path[Math.round(i * step)]);
}

export function estimateRoute(a: LatLng, b: LatLng): Route {
  return { km: roadKm(a, b), path: [a, b], estimated: true };
}

/** The road route from `a` to `b`. Falls back to an estimate when offline; failures are not cached. */
export function getRoute(a: LatLng, b: LatLng): Promise<Route> {
  const key = `${pt(a)};${pt(b)}`;
  let p = routeCache.get(key);
  if (!p) {
    p = fetchJson(`${ROUTING_URL}/route/v1/driving/${key}?overview=full&geometries=geojson`)
      .then((json): Route => {
        const r = json.routes[0];
        const path = (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
        return { km: r.distance / 1000, path: thin(path), estimated: false };
      })
      .catch(() => {
        routeCache.delete(key);
        return estimateRoute(a, b);
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
    p = fetchJson(`${ROUTING_URL}/table/v1/driving/${coords}?sources=${sources}&destinations=${stores.length}&annotations=distance`)
      .then((json) => {
        const out: Record<string, number> = {};
        stores.forEach((s, i) => {
          const m = json.distances?.[i]?.[0];
          if (typeof m === 'number') out[s.id] = m / 1000;
        });
        return out;
      })
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
  const [route, setRoute] = useState<Route | null>(null);
  const key = a && b ? `${pt(a)};${pt(b)}` : '';
  useEffect(() => {
    if (!a || !b) return setRoute(null);
    let live = true;
    setRoute(null);
    getRoute(a, b).then((r) => live && setRoute(r));
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
