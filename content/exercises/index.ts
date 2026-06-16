import type { Exercise } from '@/lib/sql/types';
import { module1Exercises } from './module1';
import { module2Exercises } from './module2';
import { module3Exercises } from './module3';
import { module4Exercises } from './module4';
import { module5Exercises } from './module5';
import { module6Exercises } from './module6';
import { module7Exercises } from './module7';
import { module8Exercises } from './module8';

export const allExercises: Exercise[] = [
  ...module1Exercises,
  ...module2Exercises,
  ...module3Exercises,
  ...module4Exercises,
  ...module5Exercises,
  ...module6Exercises,
  ...module7Exercises,
  ...module8Exercises,
];

export function getExerciseById(id: string): Exercise | undefined {
  return allExercises.find((e) => e.id === id);
}

export function exercisesByModule(moduleId: string): Exercise[] {
  return allExercises.filter((e) => e.moduleId === moduleId);
}

export interface ExerciseNav {
  moduleId: string;
  index: number; // 模块内 0-based
  total: number;
  prevId?: string;
  nextId?: string;
}

export function exerciseNav(exerciseId: string): ExerciseNav | undefined {
  const ex = getExerciseById(exerciseId);
  if (!ex) return undefined;
  const list = exercisesByModule(ex.moduleId);
  const index = list.findIndex((e) => e.id === exerciseId);
  return {
    moduleId: ex.moduleId,
    index,
    total: list.length,
    prevId: index > 0 ? list[index - 1].id : undefined,
    nextId: index < list.length - 1 ? list[index + 1].id : undefined,
  };
}
