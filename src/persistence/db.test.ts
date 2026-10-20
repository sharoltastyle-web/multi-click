import { describe, expect, it } from 'vitest';
import { createDb } from './db';

describe('database schema', () => {
  it('creates version 1 with a profiles table on an empty database', async () => {
    const name = `schema-test-${crypto.randomUUID()}`;
    const db = createDb(name);
    await db.open();
    expect(db.verno).toBe(1);
    expect(db.tables.map((t) => t.name)).toEqual(['profiles']);
    expect(db.profiles.schema.primKey.keyPath).toBe('id');
    expect(await db.profiles.count()).toBe(0);
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
});
