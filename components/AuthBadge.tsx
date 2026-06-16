'use client';
import Link from 'next/link';
import { useSession } from '@/lib/auth/useSession';

export default function AuthBadge() {
  const { user, loading } = useSession();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/'); // 强制刷新，重置全站登录态与进度缓存
  }

  return (
    <div className="flex items-center justify-end gap-3 px-4 py-2 text-sm">
      {loading ? null : user ? (
        <>
          <span className="text-slate-400">{user.email}</span>
          <button onClick={logout} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300">
            退出
          </button>
        </>
      ) : (
        <Link href="/login" className="rounded border border-slate-700 px-2 py-0.5 text-sky-400">
          登录
        </Link>
      )}
    </div>
  );
}
