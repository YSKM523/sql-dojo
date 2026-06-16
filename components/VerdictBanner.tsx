import type { Verdict } from '@/lib/sql/types';
import { CheckCircle2, XCircle } from 'lucide-react';

export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  if (verdict.passed) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok-soft px-4 py-3 text-sm font-medium text-ok"
      >
        <CheckCircle2 size={18} /> 通过！答案正确。
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-md border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad"
    >
      <XCircle size={18} /> 还不对：{verdict.reason ?? '结果与期望不一致'}
    </div>
  );
}
