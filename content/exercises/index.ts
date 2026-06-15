import type { Exercise } from '@/lib/sql/types';
import { module1Exercises } from './module1';
import { module2Exercises } from './module2';
import { module3Exercises } from './module3';
import { module4Exercises } from './module4';

export const allExercises: Exercise[] = [
  ...module1Exercises,
  ...module2Exercises,
  ...module3Exercises,
  ...module4Exercises,
];

export function getExerciseById(id: string): Exercise | undefined {
  return allExercises.find((e) => e.id === id);
}

export function exercisesByModule(moduleId: string): Exercise[] {
  return allExercises.filter((e) => e.moduleId === moduleId);
}
