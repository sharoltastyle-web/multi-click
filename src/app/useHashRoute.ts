import { useEffect, useState } from 'react';
import { parseHash, resolveRoute, ROUTE_HASH, type Route } from './routes';

function currentRoute(hasActiveProfile: boolean): Route {
  return resolveRoute(parseHash(window.location.hash), hasActiveProfile);
}

/** Tracks the hash route and replaces invalid hashes so Back never loops on a redirect. */
export function useHashRoute(hasActiveProfile: boolean): Route {
  const [route, setRoute] = useState<Route>(() => currentRoute(hasActiveProfile));

  useEffect(() => {
    const sync = () => {
      const next = currentRoute(hasActiveProfile);
      if (window.location.hash !== ROUTE_HASH[next]) {
        window.location.replace(ROUTE_HASH[next]);
      }
      setRoute(next);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [hasActiveProfile]);

  return route;
}
