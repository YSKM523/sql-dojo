import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ExerciseNav } from '@/content/exercises';

export function ExerciseNavBar({ nav }: { nav: ExerciseNav }) {
  return (
    <nav className="flex items-center justify-between border-t border-line pt-4 text-sm">
      {nav.prevId ? (
        <Link href={`/exercise/${nav.prevId}`} className="inline-flex items-center gap-1 text-link">
          <ChevronLeft size={15} /> 上一题
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 text-fg3">
          <ChevronLeft size={15} /> 上一题
        </span>
      )}
      <Link href={`/learn/${nav.moduleId}`} className="text-fg2">
        第 {nav.index + 1} / {nav.total} 题 · 回模块
      </Link>
      {nav.nextId ? (
        <Link href={`/exercise/${nav.nextId}`} className="inline-flex items-center gap-1 text-link">
          下一题 <ChevronRight size={15} />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 text-fg3">
          下一题 <ChevronRight size={15} />
        </span>
      )}
    </nav>
  );
}
