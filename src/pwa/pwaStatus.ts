/**
 * Offline-readiness state of the app, as a pure reducer.
 * "Ready" means a service worker finished installing (full precache) and controls the page.
 */
export interface PwaState {
  supported: boolean;
  ready: boolean;
  /** True only right after the first preparation completed, while the short message shows. */
  justReady: boolean;
  installFailed: boolean;
  online: boolean;
}

export type PwaEvent =
  | { type: 'alreadyReady' }
  | { type: 'becameReady' }
  | { type: 'installFailed' }
  | { type: 'retrying' }
  | { type: 'online' }
  | { type: 'offline' }
  | { type: 'readyMessageDone' };

export type PwaDisplay = 'none' | 'readyMessage' | 'needsConnection';

export const PWA_READY_MESSAGE = 'האפליקציה מוכנה לשימוש גם בלי אינטרנט';
export const PWA_NEEDS_CONNECTION_MESSAGE = 'נדרש חיבור לאינטרנט להשלמת הטעינה הראשונית';

export function initialPwaState(supported: boolean, online: boolean): PwaState {
  return { supported, ready: false, justReady: false, installFailed: false, online };
}

export function pwaReducer(state: PwaState, event: PwaEvent): PwaState {
  switch (event.type) {
    case 'alreadyReady':
      return { ...state, ready: true, justReady: false, installFailed: false };
    case 'becameReady':
      if (state.ready) return state;
      return { ...state, ready: true, justReady: true, installFailed: false };
    case 'installFailed':
      return state.ready ? state : { ...state, installFailed: true };
    case 'retrying':
      return { ...state, installFailed: false };
    case 'online':
      return { ...state, online: true };
    case 'offline':
      return { ...state, online: false };
    case 'readyMessageDone':
      return { ...state, justReady: false };
  }
}

export function pwaDisplay(state: PwaState): PwaDisplay {
  if (!state.supported) return 'none';
  if (state.justReady) return 'readyMessage';
  if (state.ready) return 'none';
  if (!state.online || state.installFailed) return 'needsConnection';
  return 'none';
}
