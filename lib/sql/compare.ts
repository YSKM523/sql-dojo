import type { ResultSet, Verdict } from './types';

// 单元格规范化：标量打 'V:' 前缀 → null(JSON null) 与字符串天然区分、
// 且忽略 JS 类型差异（1 与 "1" 视为相等，更宽容）。
function canonCell(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return 'D:' + v.toISOString();
  if (typeof v === 'object') return 'O:' + JSON.stringify(v);
  return 'V:' + String(v);
}

// 用 JSON 序列化整行 → 列边界无歧义，避免拼接碰撞。
function rowKey(row: unknown[]): string {
  return JSON.stringify(row.map(canonCell));
}

export function compareResults(
  expected: ResultSet,
  actual: ResultSet,
  orderMatters: boolean,
): Verdict {
  if (actual.columns.length !== expected.columns.length) {
    return {
      passed: false,
      reason: `期望 ${expected.columns.length} 列，实际 ${actual.columns.length} 列`,
    };
  }
  if (actual.rows.length !== expected.rows.length) {
    return {
      passed: false,
      reason: `期望 ${expected.rows.length} 行，实际 ${actual.rows.length} 行`,
    };
  }

  if (orderMatters) {
    for (let i = 0; i < expected.rows.length; i++) {
      if (rowKey(expected.rows[i]) !== rowKey(actual.rows[i])) {
        return { passed: false, reason: `第 ${i + 1} 行与期望不一致（注意排序）` };
      }
    }
    return { passed: true };
  }

  const bag = new Map<string, number>();
  for (const r of expected.rows) {
    const k = rowKey(r);
    bag.set(k, (bag.get(k) ?? 0) + 1);
  }
  for (const r of actual.rows) {
    const k = rowKey(r);
    const n = bag.get(k);
    if (!n) return { passed: false, reason: '结果集内容与期望不一致' };
    bag.set(k, n - 1);
  }
  return { passed: true };
}
