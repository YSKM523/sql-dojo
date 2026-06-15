'use client';
import { useCompletedIds } from '@/lib/progress/useProgress';

export function ModuleProgressBadge({ exerciseIds }: { exerciseIds: string[] }) {
  const done = new Set(useCompletedIds());
  const n = exerciseIds.filter((id) => done.has(id)).length;
  const total = exerciseIds.length;
  return (
    <span className="text-xs text-slate-500">
      {n} / {total} 通关
    </span>
  );
}
