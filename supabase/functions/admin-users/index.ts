// Admin-only account changes that need the server's secret key. Called from the admin dashboard with
// supabase.functions.invoke('admin-users', { body }).
//
//   { op: 'set_email', user_id, email } -> { email }   (rider accounts only; the new email works right away)
//
// The caller must be signed in as an admin (checked here; the function is deployed without the JWT gate so
// the same CORS + sign-in handling as `route` applies).
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

const authClient = createClient(URL_, PUBLISHABLE, { auth: { persistSession: false } });
const db = createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: claims, error: authErr } = await authClient.auth.getClaims(token);
  const caller = claims?.claims?.sub;
  if (authErr || !caller) return json({ error: 'Please sign in.' }, 401);
  const { data: me } = await db.from('profiles').select('role').eq('id', caller).maybeSingle();
  if (me?.role !== 'admin') return json({ error: 'Admins only.' }, 403);

  const body = await req.json().catch(() => ({}));
  if (body.op === 'set_email') {
    const userId = String(body.user_id ?? '');
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) return json({ error: 'Enter a valid email address.' }, 400);
    const { data: rider } = await db.from('riders').select('id').eq('id', userId).maybeSingle();
    if (!rider) return json({ error: 'Only rider accounts can be changed here.' }, 400);
    const { data, error } = await db.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) {
      const taken = /already|registered|exists/i.test(error.message);
      return json({ error: taken ? 'That email is already used by another account.' : error.message }, taken ? 409 : 400);
    }
    return json({ email: data.user?.email ?? email });
  }
  return json({ error: 'Unknown op' }, 400);
});
