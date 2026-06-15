import { getExerciseById, exerciseNav } from '@/content/exercises';
import { Playground } from '@/components/Playground';
import { ExerciseNavBar } from '@/components/ExerciseNavBar';
import { notFound } from 'next/navigation';

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = getExerciseById(id);
  if (!exercise) notFound();
  const nav = exerciseNav(exercise.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-sky-400">
          {exercise.moduleId} · 难度 {exercise.difficulty}
        </p>
        <h1 className="text-2xl font-bold text-slate-100">{exercise.title}</h1>
      </header>
      <p className="leading-relaxed text-slate-300">{exercise.prompt}</p>
      <Playground exercise={exercise} />
      {nav && <ExerciseNavBar nav={nav} />}
    </main>
  );
}
