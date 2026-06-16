import Link from 'next/link';
import type { Exercise } from '@/lib/sql/types';
import { Check } from 'lucide-react';

export function ExerciseList({
  exercises,
  completedIds,
}: {
  exercises: Exercise[];
  completedIds?: Set<string>;
}) {
  const done = completedIds ?? new Set<string>();
  return (
    <ol className="space-y-2">
      {exercises.map((ex, i) => (
        <li key={ex.id}>
          <Link
            href={`/exercise/${ex.id}`}
            className="flex items-center justify-between rounded-md border border-line bg-panel px-4 py-3 shadow-card transition-colors hover:border-fg3"
          >
            <span className="text-fg">
              <span className="mr-2 text-fg3">{i + 1}.</span>
              {ex.title}
            </span>
            {done.has(ex.id) ? (
              <span aria-label="已通关" className="text-ok">
                <Check size={16} />
              </span>
            ) : (
              <span className="text-xs text-fg3">难度 {ex.difficulty}</span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}
