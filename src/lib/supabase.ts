import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Connection to the RideGo Supabase project. Set these in the `.env` file at the project root:
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=...   (the anon / publishable key — safe to ship in the app; data is protected by
 *                                        the row-level security rules in supabase/schema.sql)
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = /^https:\/\/.+/.test(url) && anonKey.length > 20;

export const supabase = createClient(supabaseConfigured ? url : 'https://not-configured.invalid', supabaseConfigured ? anonKey : 'not-configured', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the login fresh only while the app is in the foreground (recommended for React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Turns a Supabase/Postgres error into a sentence for the user. */
export function errorText(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/Failed to fetch|Network request failed|NetworkError/i.test(msg)) return 'No connection to the server. Check your internet and try again.';
  if (/Invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/User already registered/i.test(msg)) return 'An account with this email already exists. Log in instead.';
  if (/Password should be/i.test(msg)) return 'Password must be at least 6 characters.';
  return msg;
}
