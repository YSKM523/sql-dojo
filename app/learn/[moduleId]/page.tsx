import { getModuleById } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { LessonView } from '@/components/LessonView';
import { ExerciseListClient } from '@/components/ExerciseListClient';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
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
      <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-link">
        <ChevronLeft size={15} /> 返回路线图
      </Link>
      <header>
        <p className="text-xs text-fg3">
          模块 {mod.order} · {mod.tierLabel}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-fg">{mod.title}</h1>
      </header>
      <LessonView markdown={mod.lesson} />
      <section>
        <h2 className="mb-3 text-lg font-semibold text-fg">练习（{exercises.length}）</h2>
        <ExerciseListClient exercises={exercises} />
      </section>
    </main>
  );
}
