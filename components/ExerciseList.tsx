import Link from 'next/link';
import type { Exercise } from '@/lib/sql/types';

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  return (
    <ol className="space-y-2">
      {exercises.map((ex, i) => (
        <li key={ex.id}>
          <Link
            href={`/exercise/${ex.id}`}
            className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-4 py-3 hover:border-slate-600"
          >
            <span className="text-slate-200">
              <span className="mr-2 text-slate-500">{i + 1}.</span>
              {ex.title}
            </span>
            <span className="text-xs text-slate-500">难度 {ex.difficulty}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
