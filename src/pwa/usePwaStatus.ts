import { useEffect, useReducer } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { initialPwaState, pwaDisplay, pwaReducer, type PwaDisplay } from './pwaStatus';

const READY_MESSAGE_MS = 5000;
const BASE = import.meta.env.BASE_URL;
const SW_URL = `${BASE}sw.js`;

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Registers the service worker once and tracks offline readiness.
 * Updates never reload the page: a new version waits until all windows are closed.
 */
export function usePwaStatus(): PwaDisplay {
  const [state, dispatch] = useReducer(
    pwaReducer,
    undefined,
    () => initialPwaState(isSupported(), typeof navigator === 'undefined' || navigator.onLine),
  );

  useEffect(() => {
    if (!isSupported()) return;
    const container = navigator.serviceWorker;
    let disposed = false;

    // A worker that turns redundant while installing means the precache failed.
    const watchInstall = (worker: ServiceWorker | null) => {
      worker?.addEventListener('statechange', () => {
        if (!disposed && worker.state === 'redundant' && !container.controller) {
          dispatch({ type: 'installFailed' });
        }
      });
    };

    if (container.controller) dispatch({ type: 'alreadyReady' });

    // The first controller only appears after a completed install (clientsClaim).
    const onControllerChange = () => {
      if (container.controller) dispatch({ type: 'becameReady' });
    };
    container.addEventListener('controllerchange', onControllerChange);

    const onOnline = () => {
      dispatch({ type: 'online' });
      // A failed first install may have removed the registration, so register again.
      if (!container.controller) {
        dispatch({ type: 'retrying' });
        container
          .register(SW_URL, { scope: BASE })
          .then((reg) => watchInstall(reg.installing))
          .catch(() => dispatch({ type: 'installFailed' }));
      }
    };
    const onOffline = () => dispatch({ type: 'offline' });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    registerSW({
      immediate: true,
      // No update prompt and no forced reload (ARCHITECTURE §6).
      onNeedRefresh: () => {},
      onNeedReload: () => {},
      onRegisteredSW: (_url, reg) => {
        if (!reg || disposed) return;
        watchInstall(reg.installing);
        reg.addEventListener('updatefound', () => watchInstall(reg.installing));
      },
      onRegisterError: () => {
        if (!disposed) dispatch({ type: 'installFailed' });
      },
    });

    return () => {
      disposed = true;
      container.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!state.justReady) return;
    const timer = window.setTimeout(() => dispatch({ type: 'readyMessageDone' }), READY_MESSAGE_MS);
    return () => window.clearTimeout(timer);
  }, [state.justReady]);

  return pwaDisplay(state);
}
