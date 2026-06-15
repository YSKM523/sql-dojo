import { allModules } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { ModuleCard } from '@/components/ModuleCard';

export default function LearnPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-100">学习路线图</h1>
      <p className="mt-2 text-slate-400">从小白到 senior，循序闯关。</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {allModules.map((m) => (
          <ModuleCard key={m.id} module={m} exerciseCount={exercisesByModule(m.id).length} />
        ))}
      </div>
    </main>
  );
}
