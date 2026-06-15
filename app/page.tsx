import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-slate-100">SQL 道场</h1>
      <p className="text-lg text-slate-300">
        在浏览器里跑真实 Postgres，边练边和 AI 结对，从小白到 senior。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/exercise/m1-01"
          className="inline-block rounded-md bg-sky-600 px-6 py-3 text-white"
        >
          立即开练 ▶
        </Link>
        <Link
          href="/learn"
          className="inline-block rounded-md border border-slate-700 px-6 py-3 text-slate-200"
        >
          看学习路线图
        </Link>
        <Link
          href="/me"
          className="inline-block rounded-md border border-slate-700 px-6 py-3 text-slate-200"
        >
          我的足迹
        </Link>
      </div>
    </main>
  );
}
