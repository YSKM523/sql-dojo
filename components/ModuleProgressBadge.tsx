'use client';
import { useCompletedIds } from '@/lib/progress/useProgress';
import { Check } from 'lucide-react';

export function ModuleProgressBadge({ exerciseIds }: { exerciseIds: string[] }) {
  const done = new Set(useCompletedIds());
  const n = exerciseIds.filter((id) => done.has(id)).length;
  const total = exerciseIds.length;
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel2">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-xs text-fg3">
        {n} / {total} 通关{n === total && total > 0 && <Check size={12} className="text-ok" />}
      </p>
    </div>
  );
}
