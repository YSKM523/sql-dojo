import { getModuleById } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { LessonView } from '@/components/LessonView';
import { ExerciseListClient } from '@/components/ExerciseListClient';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const mod = getModuleById(moduleId);
  if (!mod) notFound();
  const exercises = exercisesByModule(mod.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10">
      <Link href="/learn" className="text-sm text-sky-400">
        ← 返回路线图
      </Link>
      <header>
        <p className="text-xs text-slate-500">
          模块 {mod.order} · {mod.tierLabel}
        </p>
        <h1 className="text-2xl font-bold text-slate-100">{mod.title}</h1>
      </header>
      <LessonView markdown={mod.lesson} />
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-200">练习（{exercises.length}）</h2>
        <ExerciseListClient exercises={exercises} />
      </section>
    </main>
  );
}
