import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext } from 'react';
import { Profile, useProfile, useSession } from './api';

type Auth = { session: Session | null; loading: boolean; userId?: string; profile: Profile | null; refreshProfile: () => void };
const Ctx = createContext<Auth | null>(null);

/** Provides the signed-in user and their profile (role, name, phone) to the whole app. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const profile = useProfile(userId);
  return (
    <Ctx.Provider value={{ session, loading: loading || (!!userId && !profile.loaded), userId, profile: profile.data, refreshProfile: profile.refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
