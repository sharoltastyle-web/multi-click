export type Route = 'home' | 'learn' | 'about';

export const ROUTE_HASH: Record<Route, string> = {
  home: '#/home',
  learn: '#/learn',
  about: '#/about',
};

/** Returns the route for an exact known hash, or null for anything else. */
export function parseHash(hash: string): Route | null {
  for (const route of Object.keys(ROUTE_HASH) as Route[]) {
    if (ROUTE_HASH[route] === hash) return route;
  }
  return null;
}

/** Applies redirect rules: unknown routes go home, learn requires an active profile. */
export function resolveRoute(route: Route | null, hasActiveProfile: boolean): Route {
  if (route === null) return 'home';
  if (route === 'learn' && !hasActiveProfile) return 'home';
  return route;
}
