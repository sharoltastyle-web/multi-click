import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDb } from './db';
import { createProfileRepository } from './profileRepository';

function freshRepo() {
  const db = createDb(`repo-test-${crypto.randomUUID()}`);
  return { db, repo: createProfileRepository(() => db) };
}

afterEach(() => vi.restoreAllMocks());

describe('profileRepository', () => {
  it('creates and lists a profile', async () => {
    const { repo } = freshRepo();
    const created = await repo.createProfile({ nickname: ' דני ', avatarId: 'avatar-1' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.nickname).toBe('דני');
    expect(await repo.listProfiles()).toEqual({ ok: true, value: [created.value] });
  });

  it('keeps two profiles with the same nickname as separate identities', async () => {
    const { repo } = freshRepo();
    const a = await repo.createProfile({ nickname: 'נועה', avatarId: 'avatar-2' });
    const b = await repo.createProfile({ nickname: 'נועה', avatarId: 'avatar-3' });
    if (!a.ok || !b.ok) throw new Error('create failed');
    expect(a.value.id).not.toBe(b.value.id);
    const list = await repo.listProfiles();
    expect(list.ok && list.value.map((p) => p.id)).toEqual([a.value.id, b.value.id]);
  });

  it('lists profiles by creation time', async () => {
    const { db, repo } = freshRepo();
    await db.profiles.bulkAdd([
      { id: 'z', nickname: 'שני', avatarId: 'avatar-1', createdAt: 2 },
      { id: 'a', nickname: 'ראשון', avatarId: 'avatar-1', createdAt: 1 },
    ]);
    const list = await repo.listProfiles();
    expect(list.ok && list.value.map((p) => p.id)).toEqual(['a', 'z']);
  });

  it('reports a storage error and stores nothing when the write fails', async () => {
    const { db, repo } = freshRepo();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db.profiles, 'add').mockRejectedValueOnce(new Error('QuotaExceededError'));
    expect(await repo.createProfile({ nickname: 'דני', avatarId: 'avatar-1' })).toEqual({
      ok: false,
      error: 'storage',
    });
    expect(await db.profiles.count()).toBe(0);
  });

  it('reports a storage error when the database cannot be read', async () => {
    const { db, repo } = freshRepo();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db.profiles, 'toArray').mockRejectedValueOnce(new Error('open failed'));
    expect(await repo.listProfiles()).toEqual({ ok: false, error: 'storage' });
  });
});
