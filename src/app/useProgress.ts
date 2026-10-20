import { useCallback, useEffect, useRef, useState } from 'react';
import { aggregateDaily, type DailyProgress } from '../domain/progress';
import {
  exerciseResultRepository,
  type ExerciseResultRepository,
} from '../persistence/exerciseResultRepository';

export type ProgressStatus = 'loading' | 'ready' | 'error';

/** Daily progress of one profile, always derived from the stored results. */
export function useProgress(
  profileId: string,
  { repository = exerciseResultRepository }: { repository?: ExerciseResultRepository } = {},
) {
  const [status, setStatus] = useState<ProgressStatus>('loading');
  const [days, setDays] = useState<DailyProgress[]>([]);
  // Only the latest request may update the view; a late answer for another profile is dropped.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    const result = await repository.listResults(profileId);
    if (request !== requestRef.current) return;
    if (result.ok) {
      setDays(aggregateDaily(result.value));
      setStatus('ready');
    } else {
      setStatus('error');
    }
  }, [profileId, repository]);

  useEffect(() => {
    setStatus('loading');
    setDays([]);
    void load();
    return () => {
      // Invalidate any request still running for this profile.
      requestRef.current += 1;
    };
  }, [load]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  return { status, days, reload };
}
