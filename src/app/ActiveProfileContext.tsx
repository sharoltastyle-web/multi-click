import { createContext, useContext, useState, type ReactNode } from 'react';

interface ActiveProfileValue {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
}

const ActiveProfileContext = createContext<ActiveProfileValue | null>(null);

/** Holds the active profile id in memory only; it is never persisted. */
export function ActiveProfileProvider({
  initialProfileId = null,
  children,
}: {
  initialProfileId?: string | null;
  children: ReactNode;
}) {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(initialProfileId);
  return (
    <ActiveProfileContext.Provider value={{ activeProfileId, setActiveProfileId }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile(): ActiveProfileValue {
  const value = useContext(ActiveProfileContext);
  if (!value) throw new Error('useActiveProfile must be used inside ActiveProfileProvider');
  return value;
}
