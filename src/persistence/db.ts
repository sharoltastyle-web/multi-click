import Dexie, { type EntityTable } from 'dexie';
import type { Profile } from '../domain/profile';

export const DB_NAME = 'kefel-bekef-db';

export type AppDb = Dexie & {
  profiles: EntityTable<Profile, 'id'>;
};

/**
 * Schema versions. Rules for future changes:
 * - Never edit or remove an existing version; add a new `db.version(N)` below it.
 * - Prefer additive changes; put data conversions in that version's `upgrade()`.
 * - Never delete the database to recover from an error.
 */
export function createDb(name = DB_NAME): AppDb {
  const db = new Dexie(name) as AppDb;
  db.version(1).stores({
    profiles: 'id',
  });
  // Let a newer tab upgrade the schema instead of being blocked by this connection.
  db.on('versionchange', () => {
    db.close();
    return false;
  });
  return db;
}

let shared: AppDb | null = null;

export function getDb(): AppDb {
  shared ??= createDb();
  return shared;
}
