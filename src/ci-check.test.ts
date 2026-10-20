import { expect, test } from 'vitest';

// Deliberately failing test: proves that a failing check blocks deployment. Never merge.
test('deliberately failing check', () => {
  expect(1 + 1).toBe(3);
});
