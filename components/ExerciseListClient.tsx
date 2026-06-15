'use client';
import type { Exercise } from '@/lib/sql/types';
import { ExerciseList } from './ExerciseList';
import { useCompletedIds } from '@/lib/progress/useProgress';

export function ExerciseListClient({ exercises }: { exercises: Exercise[] }) {
  const completedIds = new Set(useCompletedIds());
  return <ExerciseList exercises={exercises} completedIds={completedIds} />;
}
