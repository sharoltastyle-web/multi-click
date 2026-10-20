import { describe, expect, it } from 'vitest';
import { initialPwaState, pwaDisplay, pwaReducer, type PwaEvent, type PwaState } from './pwaStatus';

function run(state: PwaState, ...events: PwaEvent['type'][]): PwaState {
  return events.reduce((s, type) => pwaReducer(s, { type } as PwaEvent), state);
}

describe('pwaStatus', () => {
  it('shows nothing when service workers are not supported, even offline', () => {
    const state = run(initialPwaState(false, false), 'installFailed');
    expect(pwaDisplay(state)).toBe('none');
  });

  it('shows nothing while preparing online', () => {
    expect(pwaDisplay(initialPwaState(true, true))).toBe('none');
  });

  it('shows the ready message only after preparation completed, then hides it', () => {
    const ready = run(initialPwaState(true, true), 'becameReady');
    expect(pwaDisplay(ready)).toBe('readyMessage');
    expect(pwaDisplay(run(ready, 'readyMessageDone'))).toBe('none');
  });

  it('shows the ready message only once', () => {
    const state = run(initialPwaState(true, true), 'becameReady', 'readyMessageDone', 'becameReady');
    expect(pwaDisplay(state)).toBe('none');
  });

  it('does not show a ready message when an earlier visit already prepared the app', () => {
    expect(pwaDisplay(run(initialPwaState(true, true), 'alreadyReady'))).toBe('none');
  });

  it('asks for a connection when offline before preparation completed', () => {
    expect(pwaDisplay(run(initialPwaState(true, true), 'offline'))).toBe('needsConnection');
    expect(pwaDisplay(initialPwaState(true, false))).toBe('needsConnection');
  });

  it('asks for a connection when the install (precache) failed', () => {
    expect(pwaDisplay(run(initialPwaState(true, true), 'installFailed'))).toBe('needsConnection');
  });

  it('does not ask for a connection when offline after preparation', () => {
    expect(pwaDisplay(run(initialPwaState(true, true), 'alreadyReady', 'offline'))).toBe('none');
    expect(pwaDisplay(run(initialPwaState(true, true), 'alreadyReady', 'installFailed'))).toBe('none');
  });

  it('keeps asking until a retry actually completes', () => {
    const failed = run(initialPwaState(true, false), 'installFailed');
    const retrying = run(failed, 'online', 'retrying');
    expect(pwaDisplay(retrying)).toBe('none');
    expect(pwaDisplay(run(retrying, 'installFailed'))).toBe('needsConnection');
    expect(pwaDisplay(run(retrying, 'becameReady'))).toBe('readyMessage');
  });
});
