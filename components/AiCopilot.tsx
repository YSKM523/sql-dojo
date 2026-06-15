'use client';
import { useState } from 'react';
import type { AiAction } from '@/lib/ai/prompts';

export function AiCopilot({
  exerciseId,
  getSql,
  getError,
}: {
  exerciseId: string;
  getSql: () => string;
  getError: () => string | null;
}) {
  const [loading, setLoading] = useState<AiAction | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(action: AiAction) {
    setLoading(action);
    setReply(null);
    setError(null);
    try {
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, exerciseId, sql: getSql(), errorMsg: getError() ?? undefined }),
      });
      const data = (await resp.json()) as { reply?: string; error?: string };
      if (!resp.ok || data.error) setError(data.error ?? '出错了');
      else setReply(data.reply ?? '');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(null);
    }
  }

  const btn = 'rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-50';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <p className="mb-2 text-xs text-slate-500">AI 副驾（DeepSeek）</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => ask('hint')} disabled={!!loading} className={btn}>
          {loading === 'hint' ? '思考中…' : '💡 给点提示'}
        </button>
        <button onClick={() => ask('explain')} disabled={!!loading} className={btn}>
          {loading === 'explain' ? '思考中…' : '🔍 解释这条 SQL'}
        </button>
        <button onClick={() => ask('debug')} disabled={!!loading} className={btn}>
          {loading === 'debug' ? '思考中…' : '🐞 为什么报错'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>}
      {reply && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{reply}</p>
      )}
    </div>
  );
}
