import Link from 'next/link';
import type { ExerciseNav } from '@/content/exercises';

export function ExerciseNavBar({ nav }: { nav: ExerciseNav }) {
  return (
    <nav className="flex items-center justify-between pt-2 text-sm">
      {nav.prevId ? (
        <Link href={`/exercise/${nav.prevId}`} className="text-sky-400">
          ← 上一题
        </Link>
      ) : (
        <span className="text-slate-600">← 上一题</span>
      )}
      <Link href={`/learn/${nav.moduleId}`} className="text-slate-400">
        第 {nav.index + 1} / {nav.total} 题 · 回模块
      </Link>
      {nav.nextId ? (
        <Link href={`/exercise/${nav.nextId}`} className="text-sky-400">
          下一题 →
        </Link>
      ) : (
        <span className="text-slate-600">下一题 →</span>
      )}
    </nav>
  );
}
