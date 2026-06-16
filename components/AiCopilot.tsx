'use client';
import { useState } from 'react';
import { Lightbulb, Search, Bug } from 'lucide-react';
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

  const btn =
    'inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-3 py-1.5 text-sm text-fg disabled:opacity-50 hover:border-fg3';
  return (
    <div className="rounded-md border border-line bg-panel p-4 shadow-card">
      <p className="mb-2 text-xs text-fg3">AI 副驾（DeepSeek）</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => ask('hint')} disabled={!!loading} className={btn}>
          <Lightbulb size={15} /> {loading === 'hint' ? '思考中…' : '给点提示'}
        </button>
        <button onClick={() => ask('explain')} disabled={!!loading} className={btn}>
          <Search size={15} /> {loading === 'explain' ? '思考中…' : '解释这条 SQL'}
        </button>
        <button onClick={() => ask('debug')} disabled={!!loading} className={btn}>
          <Bug size={15} /> {loading === 'debug' ? '思考中…' : '为什么报错'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      {reply && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg">{reply}</p>
      )}
    </div>
  );
}
