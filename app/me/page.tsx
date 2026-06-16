'use client';
import Link from 'next/link';
import { allModules } from '@/content/modules';
import { exercisesByModule, allExercises } from '@/content/exercises';
import { useCompletedIds } from '@/lib/progress/useProgress';
import { clearProgress } from '@/lib/progress/store';
import { useSession } from '@/lib/auth/useSession';

export default function MePage() {
  const done = new Set(useCompletedIds());
  const { user, loading } = useSession();
  const total = allExercises.length;
  const solved = allExercises.filter((e) => done.has(e.id)).length;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-extrabold text-fg">我的足迹</h1>
        <p className="mt-2 text-fg2">
          已通关 <span className="font-bold text-brand">{solved}</span> / {total} 题
        </p>
        {!loading &&
          (user ? (
            <p className="mt-1 text-sm text-fg3">已登录 {user.email} · 进度已云端同步</p>
          ) : (
            <p className="mt-1 text-sm text-fg3">
              <Link href="/login" className="text-link">登录</Link> 以跨设备保存进度
            </p>
          ))}
      </header>

      <ul className="space-y-3">
        {allModules.map((m) => {
          const ids = exercisesByModule(m.id).map((e) => e.id);
          const n = ids.filter((id) => done.has(id)).length;
          const pct = ids.length ? Math.round((n / ids.length) * 100) : 0;
          return (
            <li key={m.id} className="rounded-md border border-line bg-panel p-4 shadow-card">
              <div className="flex items-center justify-between text-sm">
                <Link href={`/learn/${m.id}`} className="text-fg">
                  {m.title}
                </Link>
                <span className="text-fg3">
                  {n} / {ids.length}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-panel2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-4">
        <Link href="/learn" className="text-sm text-link">
          去路线图
        </Link>
        <button
          onClick={() => {
            if (confirm('确定清空本机进度？')) clearProgress();
          }}
          className="rounded-md border border-line px-3 py-1 text-sm text-fg2 hover:text-fg"
        >
          清空进度
        </button>
      </div>
    </main>
  );
}
