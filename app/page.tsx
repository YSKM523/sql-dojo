import Link from 'next/link';
import { Play, Map, User } from 'lucide-react';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-20">
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">SQL 道场</h1>
      <p className="mt-3 max-w-xl text-lg text-fg2">
        在浏览器里跑真实 Postgres，边练边和 AI 结对，从小白到 senior。8 个模块循序闯关。
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/exercise/m1-01"
          className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover"
        >
          <Play size={16} /> 立即开练
        </Link>
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-5 py-2.5 text-fg shadow-card hover:border-fg3"
        >
          <Map size={16} /> 学习路线图
        </Link>
        <Link
          href="/me"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-5 py-2.5 text-fg shadow-card hover:border-fg3"
        >
          <User size={16} /> 我的足迹
        </Link>
      </div>
    </main>
  );
}
