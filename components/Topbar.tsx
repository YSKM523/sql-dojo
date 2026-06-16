'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database } from 'lucide-react';
import { useSession } from '@/lib/auth/useSession';
import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  const pathname = usePathname();
  const { user, loading } = useSession();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/');
  }

  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`flex h-full items-center text-sm ${
        active
          ? 'font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]'
          : 'text-fg2 hover:text-fg'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center gap-5 border-b border-line bg-panel px-4">
      <Link href="/" className="flex items-center gap-2 font-bold text-fg">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-brand text-white">
          <Database size={13} />
        </span>
        SQL 道场
      </Link>
      <nav className="flex h-full items-center gap-4">
        {link('/learn', '学习路线图', pathname.startsWith('/learn') || pathname.startsWith('/exercise'))}
        {link('/me', '我的足迹', pathname === '/me')}
      </nav>
      <div className="flex-1" />
      <ThemeToggle />
      {!loading &&
        (user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-fg2">{user.email}</span>
            <button
              onClick={logout}
              className="rounded-md border border-line px-2.5 py-1 text-fg2 hover:text-fg"
            >
              退出
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            登录
          </Link>
        ))}
    </header>
  );
}
