'use client';
import { useState } from 'react';

type Step = 'email' | 'code';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setErr(data.error ?? '发送失败');
        return;
      }
      setStep('code');
    } catch {
      setErr('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = (await res.json()) as { user?: unknown; error?: string };
      if (!res.ok) {
        setErr(data.error ?? '验证失败');
        return;
      }
      window.location.assign('/me');
    } catch {
      setErr('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-md border border-line bg-panel px-3 py-2 text-fg placeholder:text-fg3';
  const primary =
    'w-full rounded-md bg-brand px-3 py-2 font-semibold text-white hover:bg-brand-hover disabled:opacity-50';

  return (
    <main className="mx-auto w-full max-w-sm space-y-6 px-4 py-16">
      <header>
        <h1 className="text-2xl font-extrabold text-fg">登录 SQL 道场</h1>
        <p className="mt-2 text-sm text-fg2">用邮箱验证码登录，进度自动跨设备同步。</p>
      </header>

      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={input}
          />
          <button type="submit" disabled={busy} className={primary}>
            {busy ? '发送中…' : '发送验证码'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-fg2">
            验证码已发往 <span className="text-fg">{email}</span>
          </p>
          <input
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6 位验证码"
            className={`${input} tracking-widest`}
          />
          <button type="submit" disabled={busy} className={primary}>
            {busy ? '验证中…' : '登录'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setErr(null);
            }}
            className="w-full text-sm text-fg2 hover:text-fg"
          >
            换个邮箱
          </button>
        </form>
      )}

      {err ? <p className="text-sm text-bad">{err}</p> : null}
    </main>
  );
}
