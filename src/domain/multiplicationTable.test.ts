import { describe, expect, it } from 'vitest';
import { multiplicationRows } from './multiplicationTable';

describe('multiplicationRows', () => {
  it('has all 100 correct products for 1–10', () => {
    const rows = multiplicationRows();
    expect(rows).toHaveLength(10);
    for (let a = 1; a <= 10; a++) {
      expect(rows[a - 1]).toHaveLength(10);
      for (let b = 1; b <= 10; b++) {
        expect(rows[a - 1]![b - 1]).toBe(a * b);
      }
    }
  });
});
