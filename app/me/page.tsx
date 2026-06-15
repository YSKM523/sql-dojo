'use client';
import Link from 'next/link';
import { allModules } from '@/content/modules';
import { exercisesByModule, allExercises } from '@/content/exercises';
import { useCompletedIds } from '@/lib/progress/useProgress';
import { clearProgress } from '@/lib/progress/store';

export default function MePage() {
  const done = new Set(useCompletedIds());
  const total = allExercises.length;
  const solved = allExercises.filter((e) => done.has(e.id)).length;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">我的足迹</h1>
        <p className="mt-2 text-slate-300">
          已通关 <span className="font-bold text-emerald-400">{solved}</span> / {total} 题
        </p>
      </header>

      <ul className="space-y-3">
        {allModules.map((m) => {
          const ids = exercisesByModule(m.id).map((e) => e.id);
          const n = ids.filter((id) => done.has(id)).length;
          const pct = ids.length ? Math.round((n / ids.length) * 100) : 0;
          return (
            <li key={m.id} className="rounded-md border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between text-sm">
                <Link href={`/learn/${m.id}`} className="text-slate-200">
                  {m.title}
                </Link>
                <span className="text-slate-400">
                  {n} / {ids.length}
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded bg-slate-800">
                <div className="h-2 rounded bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-4">
        <Link href="/learn" className="text-sm text-sky-400">
          ← 去路线图
        </Link>
        <button
          onClick={() => {
            if (confirm('确定清空全部进度？')) clearProgress();
          }}
          className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300"
        >
          清空进度
        </button>
      </div>
    </main>
  );
}
