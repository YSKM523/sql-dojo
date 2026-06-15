'use client';
import { useState } from 'react';
import type { Exercise } from '@/lib/sql/types';
import { judgeExercise, type JudgeResult } from '@/lib/sql/judgeExercise';
import { SqlEditor } from './SqlEditor';
import { ResultTable } from './ResultTable';
import { VerdictBanner } from './VerdictBanner';

export function Playground({ exercise }: { exercise: Exercise }) {
  const [code, setCode] = useState(exercise.starterSql ?? '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setResult(await judgeExercise(exercise, code));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <SqlEditor value={code} onChange={setCode} />
      <button
        onClick={run}
        disabled={running}
        className="rounded-md bg-sky-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {running ? '运行中…' : '运行 ▶'}
      </button>
      {error && <div role="alert" className="text-sm text-rose-400">运行出错：{error}</div>}
      {result && <VerdictBanner verdict={result.verdict} />}
      {result?.actual && <ResultTable result={result.actual} />}
    </div>
  );
}
