import type { Verdict } from '@/lib/sql/types';

export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  if (verdict.passed) {
    return (
      <div role="status" className="rounded-md bg-emerald-600 px-4 py-3 text-white">
        ✅ 通过！答案正确。
      </div>
    );
  }
  return (
    <div role="alert" className="rounded-md bg-rose-600 px-4 py-3 text-white">
      ❌ 还不对：{verdict.reason ?? '结果与期望不一致'}
    </div>
  );
}
