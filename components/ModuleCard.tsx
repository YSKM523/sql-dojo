import Link from 'next/link';
import type { ModuleDef, TierKey } from '@/lib/sql/types';
import { ModuleProgressBadge } from './ModuleProgressBadge';

// tierKey → 完整静态类名（Tailwind 不会生成 `bg-${x}-600` 这种动态拼接的类）
const TIER_BADGE: Record<TierKey, string> = {
  beginner: 'bg-emerald-600 text-white',
  intermediate: 'bg-amber-600 text-white',
  senior: 'bg-rose-600 text-white',
  sprint: 'bg-sky-600 text-white',
};

export function ModuleCard({
  module,
  exerciseIds,
}: {
  module: ModuleDef;
  exerciseIds: string[];
}) {
  return (
    <Link
      href={`/learn/${module.id}`}
      className="block rounded-lg border border-slate-800 bg-slate-900 p-5 hover:border-slate-600"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">模块 {module.order}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${TIER_BADGE[module.tierKey]}`}>
          {module.tierLabel}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-bold text-slate-100">{module.title}</h3>
      <p className="mt-1 text-sm text-slate-400">{module.summary}</p>
      <p className="mt-3">
        <ModuleProgressBadge exerciseIds={exerciseIds} />
      </p>
    </Link>
  );
}
