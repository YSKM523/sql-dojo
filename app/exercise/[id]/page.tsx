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
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">
          {exercise.moduleId} · 难度 {exercise.difficulty}
        </p>
        <h1 className="text-2xl font-extrabold text-fg">{exercise.title}</h1>
      </header>
      <div className="rounded-md border border-line bg-panel p-4 text-fg2 shadow-card">
        {exercise.prompt}
      </div>
      <Playground exercise={exercise} />
      {nav && <ExerciseNavBar nav={nav} />}
    </main>
  );
}
