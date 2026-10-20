import { describe, expect, it } from 'vitest';
import { parseHash, resolveRoute } from './routes';

describe('parseHash', () => {
  it('recognizes the three routes', () => {
    expect(parseHash('#/home')).toBe('home');
    expect(parseHash('#/learn')).toBe('learn');
    expect(parseHash('#/about')).toBe('about');
  });

  it('returns null for empty or unknown hashes', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('#')).toBeNull();
    expect(parseHash('#/xyz')).toBeNull();
    expect(parseHash('#/learn/1')).toBeNull();
    expect(parseHash('#/HOME')).toBeNull();
  });
});

describe('resolveRoute', () => {
  it('sends unknown routes home', () => {
    expect(resolveRoute(null, false)).toBe('home');
    expect(resolveRoute(null, true)).toBe('home');
  });

  it('requires an active profile for learn', () => {
    expect(resolveRoute('learn', false)).toBe('home');
    expect(resolveRoute('learn', true)).toBe('learn');
  });

  it('keeps home and about as is', () => {
    expect(resolveRoute('home', false)).toBe('home');
    expect(resolveRoute('about', false)).toBe('about');
  });
});
