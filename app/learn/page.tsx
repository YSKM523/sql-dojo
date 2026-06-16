import Link from 'next/link';
import { allModules } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { ModuleCard } from '@/components/ModuleCard';

export default function LearnPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <p className="text-xs text-fg3">
        <Link href="/" className="text-link">首页</Link> / 学习路线图
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-fg">学习路线图</h1>
      <p className="mt-1 text-sm text-fg2">从小白到 senior，8 个模块循序闯关。</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allModules.map((m) => (
          <ModuleCard
            key={m.id}
            module={m}
            exerciseIds={exercisesByModule(m.id).map((e) => e.id)}
          />
        ))}
      </div>
    </main>
  );
}
