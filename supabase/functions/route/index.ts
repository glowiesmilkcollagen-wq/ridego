// RideGo road routing. Called by the apps with supabase.functions.invoke('route', { body }).
//
//   { op: 'route',  points: [[lat, lng], ...] }            -> { km, path: [[lat, lng], ...], source }
//   { op: 'matrix', origins: [[lat, lng], ...], dest: [lat, lng] } -> { km: (number | null)[], source }
//
// Uses the Google Routes API when the secret GOOGLE_MAPS_API_KEY is set (Supabase dashboard ->
// Edge Functions -> Secrets), otherwise the free OSRM demo server. Answers are cached in
// public.route_cache for 30 days so repeated trips don't cost another Google request.
// Only signed-in users can call it; points must be inside the Philippines.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const keys = (name: string) => {
  try {
    return JSON.parse(Deno.env.get(name) ?? '{}').default as string | undefined;
  } catch {
    return undefined;
  }
};
const PUBLISHABLE = keys('SUPABASE_PUBLISHABLE_KEYS') ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const SECRET = keys('SUPABASE_SECRET_KEYS') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY') ?? '';
const OSRM = 'https://router.project-osrm.org';
const CACHE_DAYS = 30;
const MAX_POINTS = 7; // up to 5 stores + pickup + drop-off
const MAX_ORIGINS = 25;
const MAX_PATH = 250;

const authClient = createClient(URL_, PUBLISHABLE, { auth: { persistSession: false } });
const db = createClient(URL_, SECRET, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type P = [number, number]; // [lat, lng]
const inPH = (p: unknown): p is P =>
  Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number' &&
  p[0] > 4 && p[0] < 22 && p[1] > 116 && p[1] < 127.5;
const round = (p: P) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;

async function fetchJson(url: string, init?: RequestInit, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(body)?.slice(0, 300)}`);
    return body;
  } finally {
    clearTimeout(t);
  }
}

function decodePolyline(str: string): P[] {
  const out: P[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d;
      else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

function thin(path: P[], max = MAX_PATH): P[] {
  const r = (p: P): P => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];
  if (path.length <= max) return path.map(r);
  const step = (path.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => r(path[Math.round(i * step)]));
}

const waypoint = (p: P) => ({ location: { latLng: { latitude: p[0], longitude: p[1] } } });

// ---------- Google ----------
async function googleRoute(points: P[]) {
  for (const travelMode of ['TWO_WHEELER', 'DRIVE']) {
    const body = await fetchJson('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: waypoint(points[0]),
        destination: waypoint(points[points.length - 1]),
        intermediates: points.slice(1, -1).map(waypoint),
        travelMode,
        routingPreference: 'TRAFFIC_UNAWARE',
        regionCode: 'PH',
      }),
    }).catch((e) => {
      if (travelMode === 'DRIVE') throw e;
      return null; // two-wheeler not available here: try car roads
    });
    const r = body?.routes?.[0];
    if (r?.distanceMeters != null) return { km: r.distanceMeters / 1000, path: decodePolyline(r.polyline?.encodedPolyline ?? '') };
  }
  throw new Error('no route');
}

async function googleMatrix(origins: P[], dest: P): Promise<(number | null)[]> {
  for (const travelMode of ['TWO_WHEELER', 'DRIVE']) {
    const rows = await fetchJson('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'originIndex,distanceMeters,condition',
      },
      body: JSON.stringify({
        origins: origins.map((p) => ({ waypoint: waypoint(p) })),
        destinations: [{ waypoint: waypoint(dest) }],
        travelMode,
        routingPreference: 'TRAFFIC_UNAWARE',
        regionCode: 'PH',
      }),
    }).catch((e) => {
      if (travelMode === 'DRIVE') throw e;
      return null;
    });
    if (!Array.isArray(rows)) continue;
    const out: (number | null)[] = origins.map(() => null);
    for (const row of rows) {
      if (row.condition === 'ROUTE_EXISTS' && typeof row.distanceMeters === 'number') out[row.originIndex ?? 0] = row.distanceMeters / 1000;
    }
    if (out.some((k) => k != null)) return out;
  }
  throw new Error('no matrix');
}

// ---------- OSRM (free fallback) ----------
const osrmPt = (p: P) => `${p[1].toFixed(6)},${p[0].toFixed(6)}`;
async function osrmRoute(points: P[]) {
  const j = await fetchJson(`${OSRM}/route/v1/driving/${points.map(osrmPt).join(';')}?overview=full&geometries=geojson`);
  const r = j.routes[0];
  return { km: r.distance / 1000, path: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as P) };
}
async function osrmMatrix(origins: P[], dest: P) {
  const coords = [...origins, dest].map(osrmPt).join(';');
  const src = origins.map((_, i) => i).join(';');
  const j = await fetchJson(`${OSRM}/table/v1/driving/${coords}?sources=${src}&destinations=${origins.length}&annotations=distance`);
  return origins.map((_, i) => (typeof j.distances?.[i]?.[0] === 'number' ? j.distances[i][0] / 1000 : null));
}

// ---------- cache ----------
const fresh = () => new Date(Date.now() - CACHE_DAYS * 864e5).toISOString();
async function cacheGet(keys: string[]) {
  const { data } = await db.from('route_cache').select('key, km, path').in('key', keys).gte('created_at', fresh());
  return new Map((data ?? []).map((r) => [r.key as string, r]));
}
async function cachePut(rows: { key: string; km: number; path?: P[] | null; source: string }[]) {
  if (!rows.length) return;
  await db.from('route_cache').upsert(rows.map((r) => ({ ...r, path: r.path ?? null, created_at: new Date().toISOString() })));
  if (Math.random() < 0.02) await db.from('route_cache').delete().lt('created_at', fresh());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: claims, error: authErr } = await authClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return json({ error: 'Please sign in.' }, 401);

  const body = await req.json().catch(() => ({}));
  const source = GOOGLE_KEY ? 'google' : 'osrm';
  try {
    if (body.op === 'route') {
      const points = body.points;
      if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS || !points.every(inPH)) {
        return json({ error: 'Bad points' }, 400);
      }
      const key = `r:${source}:${points.map(round).join(';')}`;
      const hit = (await cacheGet([key])).get(key);
      if (hit) return json({ km: hit.km, path: hit.path ?? [], source, cached: true });
      const r = GOOGLE_KEY ? await googleRoute(points) : await osrmRoute(points);
      const path = thin(r.path);
      await cachePut([{ key, km: r.km, path, source }]);
      return json({ km: r.km, path, source });
    }
    if (body.op === 'matrix') {
      const { origins, dest } = body;
      if (!Array.isArray(origins) || !origins.length || origins.length > MAX_ORIGINS || !origins.every(inPH) || !inPH(dest)) {
        return json({ error: 'Bad points' }, 400);
      }
      const keys = origins.map((o: P) => `m:${source}:${round(o)}|${round(dest)}`);
      const hits = await cacheGet(keys);
      const km: (number | null)[] = keys.map((k: string) => hits.get(k)?.km ?? null);
      const missing = km.map((k, i) => (k == null ? i : -1)).filter((i) => i >= 0);
      if (missing.length) {
        const sub = missing.map((i) => origins[i] as P);
        const got = GOOGLE_KEY ? await googleMatrix(sub, dest) : await osrmMatrix(sub, dest);
        const rows: { key: string; km: number; source: string }[] = [];
        got.forEach((k, j) => {
          km[missing[j]] = k;
          if (k != null) rows.push({ key: keys[missing[j]], km: k, source });
        });
        await cachePut(rows);
      }
      return json({ km, source });
    }
    return json({ error: 'Unknown op' }, 400);
  } catch (e) {
    console.error('route failed', String(e));
    return json({ error: 'Routing unavailable' }, 502);
  }
});
