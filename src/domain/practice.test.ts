import { describe, expect, it } from 'vitest';
import {
  createExercise,
  hintExpression,
  hintTerms,
  isCorrectAnswer,
  randomFactor,
  validateAnswer,
} from './practice';

const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('exercise creation', () => {
  it('only produces factors 1–10, including the edges of the random source', () => {
    expect(randomFactor(() => 0)).toBe(1);
    expect(randomFactor(() => 0.9999999)).toBe(10);
    expect(randomFactor(() => 1)).toBe(10);
    for (let i = 0; i < 2000; i++) {
      const { factorA, factorB } = createExercise('random', 1);
      expect(factorA).toBeGreaterThanOrEqual(1);
      expect(factorA).toBeLessThanOrEqual(10);
      expect(factorB).toBeGreaterThanOrEqual(1);
      expect(factorB).toBeLessThanOrEqual(10);
      expect(Number.isInteger(factorA) && Number.isInteger(factorB)).toBe(true);
    }
  });

  it('reaches every factor 1–10', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 10; i++) seen.add(randomFactor(() => i / 10));
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('fixes the chosen factor as the first factor in selected-factor mode', () => {
    for (let factor = 1; factor <= 10; factor++) {
      for (let i = 0; i < 50; i++) {
        const exercise = createExercise('selectedFactor', factor);
        expect(exercise).toMatchObject({ mode: 'selectedFactor', selectedFactor: factor, factorA: factor });
        expect(exercise.factorB).toBeGreaterThanOrEqual(1);
        expect(exercise.factorB).toBeLessThanOrEqual(10);
      }
    }
  });

  it('random mode uses both random draws and has no selected factor', () => {
    const exercise = createExercise('random', 7, sequence(0.25, 0.75));
    expect(exercise).toMatchObject({ mode: 'random', factorA: 3, factorB: 8 });
    expect(exercise.selectedFactor).toBeUndefined();
  });

  it('gives every new instance its own id, even with the same factors', () => {
    const a = createExercise('random', 1, () => 0);
    const b = createExercise('random', 1, () => 0);
    expect(a.factorA).toBe(b.factorA);
    expect(a.id).not.toBe(b.id);
  });

  it('rejects a factor outside 1–10', () => {
    expect(() => createExercise('selectedFactor', 0)).toThrow();
    expect(() => createExercise('selectedFactor', 11)).toThrow();
  });
});

describe('answer validation', () => {
  it.each(['', '   ', '0', '101', '12abc', 'abc', '5.5', '-3', '1e2', '+4', '١٢', '1000'])(
    'rejects %j',
    (text) => {
      expect(validateAnswer(text)).toEqual({ ok: false });
    },
  );

  it.each([
    ['1', 1],
    ['100', 100],
    [' 12 ', 12],
    ['07', 7],
  ])('accepts %j', (text, value) => {
    expect(validateAnswer(text)).toEqual({ ok: true, value });
  });
});

describe('checking and hints', () => {
  it('compares the answer to the product', () => {
    expect(isCorrectAnswer({ factorA: 3, factorB: 4 }, 12)).toBe(true);
    expect(isCorrectAnswer({ factorA: 3, factorB: 4 }, 7)).toBe(false);
  });

  it('matches the PRD examples', () => {
    expect(hintExpression({ factorA: 3, factorB: 4 })).toBe('4 + 4 + 4');
    expect(hintExpression({ factorA: 1, factorB: 7 })).toBe('1 + 1 + 1 + 1 + 1 + 1 + 1');
    expect(hintExpression({ factorA: 7, factorB: 1 })).toBe('1 + 1 + 1 + 1 + 1 + 1 + 1');
    expect(hintExpression({ factorA: 1, factorB: 1 })).toBe('1');
  });

  it('sums to the product and never shows the product as a single term (except 1 × 1)', () => {
    for (let a = 1; a <= 10; a++) {
      for (let b = 1; b <= 10; b++) {
        const terms = hintTerms({ factorA: a, factorB: b });
        expect(terms.reduce((sum, t) => sum + t, 0)).toBe(a * b);
        if (a * b > 1) expect(terms.length).toBeGreaterThan(1);
      }
    }
  });
});
