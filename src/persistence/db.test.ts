import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { createDb } from './db';

describe('database schema', () => {
  it('creates version 2 with profiles and exercise results on an empty database', async () => {
    const name = `schema-test-${crypto.randomUUID()}`;
    const db = createDb(name);
    await db.open();
    expect(db.verno).toBe(2);
    expect(db.tables.map((t) => t.name).sort()).toEqual(['exerciseResults', 'profiles']);
    expect(db.profiles.schema.primKey.keyPath).toBe('id');
    expect(db.exerciseResults.schema.primKey.keyPath).toBe('id');
    expect(db.exerciseResults.schema.indexes.map((i) => i.name).sort()).toEqual([
      '[profileId+firstCheckLocalDate]',
      'profileId',
    ]);
    expect(await db.profiles.count()).toBe(0);
    expect(await db.exerciseResults.count()).toBe(0);
    db.close();
  });

  it('keeps saved profiles after closing and reopening', async () => {
    const name = `reopen-test-${crypto.randomUUID()}`;
    const first = createDb(name);
    await first.profiles.add({ id: 'p1', nickname: 'נועה', avatarId: 'avatar-2', createdAt: 1 });
    first.close();

    const second = createDb(name);
    expect(await second.profiles.toArray()).toEqual([
      { id: 'p1', nickname: 'נועה', avatarId: 'avatar-2', createdAt: 1 },
    ]);
    second.close();
  });

  it('upgrades a Milestone 2 (version 1) database without losing profiles', async () => {
    const name = `migration-test-${crypto.randomUUID()}`;
    const profiles = [
      { id: 'a', nickname: 'נועה', avatarId: 'avatar-2', createdAt: 1 },
      { id: 'b', nickname: 'נועה', avatarId: 'avatar-3', createdAt: 2 },
      { id: 'c', nickname: 'דני', avatarId: 'avatar-1', createdAt: 3 },
    ];
    // Exactly the schema that Milestone 2 shipped.
    const v1 = new Dexie(name);
    v1.version(1).stores({ profiles: 'id' });
    await v1.table('profiles').bulkAdd(profiles);
    expect(v1.verno).toBe(1);
    v1.close();

    const upgraded = createDb(name);
    await upgraded.open();
    expect(upgraded.verno).toBe(2);
    expect(await upgraded.profiles.orderBy('id').toArray()).toEqual(profiles);
    expect(await upgraded.exerciseResults.count()).toBe(0);
    upgraded.close();
  });
});
