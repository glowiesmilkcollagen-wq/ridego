import React, { createContext, useContext } from 'react';
import { Rider, useMyRider } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type RiderCtx = { rider: Rider | null; loading: boolean; refresh: () => void; setRider: (r: Rider | null) => void };
const Ctx = createContext<RiderCtx | null>(null);

/** The signed-in rider's record (approval status, online, vehicle), kept live from the database. */
export function RiderProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const live = useMyRider(userId);
  return (
    <Ctx.Provider value={{ rider: live.data, loading: !!userId && !live.loaded, refresh: live.refresh, setRider: live.setData }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRider() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRider must be used inside RiderProvider');
  return v;
}
