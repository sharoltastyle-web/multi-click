import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Profile } from '../domain/profile';

interface ActiveProfileValue {
  activeProfile: Profile | null;
  selectProfile: (profile: Profile | null) => void;
}

const ActiveProfileContext = createContext<ActiveProfileValue | null>(null);

/** Holds the active profile in memory only; it is never persisted. */
export function ActiveProfileProvider({
  initialProfile = null,
  children,
}: {
  initialProfile?: Profile | null;
  children: ReactNode;
}) {
  const [activeProfile, selectProfile] = useState<Profile | null>(initialProfile);
  return (
    <ActiveProfileContext.Provider value={{ activeProfile, selectProfile }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile(): ActiveProfileValue {
  const value = useContext(ActiveProfileContext);
  if (!value) throw new Error('useActiveProfile must be used inside ActiveProfileProvider');
  return value;
}
