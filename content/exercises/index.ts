import type { Exercise } from '@/lib/sql/types';
import { module1Exercises } from './module1';

export const allExercises: Exercise[] = [...module1Exercises];

export function getExerciseById(id: string): Exercise | undefined {
  return allExercises.find((e) => e.id === id);
}
