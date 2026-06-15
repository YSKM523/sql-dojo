'use client';
import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '@/lib/sql/types';
import { ExerciseJudge, type JudgeResult } from '@/lib/sql/judgeExercise';
import { markCompleted } from '@/lib/progress/store';
import { SqlEditor } from './SqlEditor';
import { ResultTable } from './ResultTable';
import { VerdictBanner } from './VerdictBanner';
import { AiCopilot } from './AiCopilot';

export function Playground({ exercise }: { exercise: Exercise }) {
  const [code, setCode] = useState(exercise.starterSql ?? '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const judgeRef = useRef<ExerciseJudge | null>(null);

  // 卸载时关闭 PGlite 会话，释放资源。
  useEffect(() => {
    return () => {
      judgeRef.current?.close();
      judgeRef.current = null;
    };
  }, []);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      if (!judgeRef.current) judgeRef.current = new ExerciseJudge(exercise);
      const r = await judgeRef.current.judge(code);
      setResult(r);
      if (r.verdict.passed) markCompleted(exercise.id);
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
      <AiCopilot
        exerciseId={exercise.id}
        getSql={() => code}
        getError={() =>
          error ?? (result && !result.verdict.passed ? result.verdict.reason ?? null : null)
        }
      />
    </div>
  );
}
