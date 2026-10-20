import { decideAttempt, type AttemptCommand, type ExerciseResult } from '../domain/exerciseResult';
import { getDb, type AppDb } from './db';

export type AttemptOutcome =
  | { status: 'saved' | 'duplicate' | 'alreadySolved' | 'conflict'; record: ExerciseResult }
  | { status: 'error' };

export interface ExerciseResultRepository {
  submitAttempt(command: AttemptCommand): Promise<AttemptOutcome>;
  listResults(profileId: string): Promise<ExerciseResult[]>;
}

class MissingProfileError extends Error {}

export function createExerciseResultRepository(
  db: () => AppDb = getDb,
): ExerciseResultRepository {
  return {
    async submitAttempt(command) {
      try {
        const database = db();
        // A short transaction: read profile and result, decide, write. Nothing else waits inside it.
        return await database.transaction(
          'rw',
          database.profiles,
          database.exerciseResults,
          async (): Promise<AttemptOutcome> => {
            const profile = await database.profiles.get(command.profileId);
            if (!profile) throw new MissingProfileError(command.profileId);
            const existing = await database.exerciseResults.get(command.exercise.id);
            const decision = decideAttempt(existing, command);
            switch (decision.kind) {
              case 'create':
                await database.exerciseResults.add(decision.next);
                return { status: 'saved', record: decision.next };
              case 'update':
                await database.exerciseResults.put(decision.next);
                return { status: 'saved', record: decision.next };
              default:
                return { status: decision.kind, record: decision.current };
            }
          },
        );
      } catch (error) {
        console.error('Failed to save exercise result', error);
        return { status: 'error' };
      }
    },

    async listResults(profileId) {
      return db().exerciseResults.where('profileId').equals(profileId).toArray();
    },
  };
}

export const exerciseResultRepository = createExerciseResultRepository();
