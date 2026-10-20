import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttemptCommand } from '../domain/exerciseResult';
import { createExercise, type Exercise } from '../domain/practice';
import { createDb, type AppDb } from './db';
import { createExerciseResultRepository } from './exerciseResultRepository';

let db: AppDb;
let repo: ReturnType<typeof createExerciseResultRepository>;
const exercise: Exercise = { id: 'e1', factorA: 3, factorB: 4, mode: 'random' };

function command(overrides: Partial<AttemptCommand> = {}): AttemptCommand {
  return {
    profileId: 'p1',
    exercise,
    answer: 7,
    correct: false,
    submissionKey: crypto.randomUUID(),
    checkedAt: Date.now(),
    expectedRevision: 0,
    ...overrides,
  };
}

beforeEach(async () => {
  db = createDb(`results-test-${crypto.randomUUID()}`);
  await db.profiles.bulkAdd([
    { id: 'p1', nickname: 'נועה', avatarId: 'avatar-2', createdAt: 1 },
    { id: 'p2', nickname: 'נועה', avatarId: 'avatar-3', createdAt: 2 },
  ]);
  repo = createExerciseResultRepository(() => db);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  db.close();
  vi.restoreAllMocks();
});

describe('exerciseResultRepository', () => {
  it('creates on the first check and updates on the correction', async () => {
    const first = await repo.submitAttempt(command());
    expect(first).toMatchObject({ status: 'saved', record: { attemptCount: 1, revision: 1 } });
    const second = await repo.submitAttempt(
      command({ answer: 12, correct: true, expectedRevision: 1 }),
    );
    expect(second).toMatchObject({ status: 'saved', record: { attemptCount: 2, solved: true } });
    const [stored] = await db.exerciseResults.toArray();
    expect(stored).toMatchObject({ firstAttemptCorrect: false, attemptCount: 2, solved: true });
  });

  it('does not double count a retry of the same write', async () => {
    const cmd = command();
    await repo.submitAttempt(cmd);
    const retry = await repo.submitAttempt(cmd);
    expect(retry.status).toBe('duplicate');
    expect(await db.exerciseResults.get('e1')).toMatchObject({ attemptCount: 1, revision: 1 });
  });

  it('serializes two concurrent writes: one saves, the other does not count', async () => {
    const [a, b] = await Promise.all([
      repo.submitAttempt(command({ answer: 7 })),
      repo.submitAttempt(command({ answer: 8 })),
    ]);
    expect([a.status, b.status].sort()).toEqual(['conflict', 'saved']);
    expect(await db.exerciseResults.get('e1')).toMatchObject({ attemptCount: 1 });
  });

  it('records nothing after the exercise is solved', async () => {
    await repo.submitAttempt(command({ answer: 12, correct: true }));
    const late = await repo.submitAttempt(command({ answer: 13, expectedRevision: 1 }));
    expect(late.status).toBe('alreadySolved');
    expect(await db.exerciseResults.get('e1')).toMatchObject({ attemptCount: 1, solved: true });
  });

  it('refuses to write for a profile that does not exist', async () => {
    const outcome = await repo.submitAttempt(command({ profileId: 'missing' }));
    expect(outcome.status).toBe('error');
    expect(await db.exerciseResults.count()).toBe(0);
  });

  it('reports a storage failure and writes nothing', async () => {
    vi.spyOn(db.exerciseResults, 'add').mockRejectedValue(
      new DOMException('Quota exceeded', 'QuotaExceededError'),
    );
    const outcome = await repo.submitAttempt(command());
    expect(outcome.status).toBe('error');
    vi.restoreAllMocks();
    expect(await db.exerciseResults.count()).toBe(0);
  });

  it('reports an error when the database cannot be opened', async () => {
    const broken = createExerciseResultRepository(() => {
      throw new Error('IndexedDB unavailable');
    });
    expect((await broken.submitAttempt(command())).status).toBe('error');
  });

  it('keeps results separate per profile', async () => {
    const e2 = createExercise('random', 1);
    await repo.submitAttempt(command());
    await repo.submitAttempt(command({ profileId: 'p2', exercise: e2, answer: e2.factorA * e2.factorB, correct: true }));
    const ids = async (profileId: string) => {
      const listed = await repo.listResults(profileId);
      return listed.ok ? listed.value.map((r) => r.id) : null;
    };
    expect(await ids('p1')).toEqual(['e1']);
    expect(await ids('p2')).toEqual([e2.id]);
  });

  it('reports a read failure instead of throwing', async () => {
    const broken = createExerciseResultRepository(() => {
      throw new Error('IndexedDB unavailable');
    });
    expect(await broken.listResults('p1')).toEqual({ ok: false, error: 'storage' });
  });
});
