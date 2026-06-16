import type { ResultSet } from '@/lib/sql/types';

export function ResultTable({ result }: { result: ResultSet }) {
  if (result.rows.length === 0) {
    return <p className="text-sm text-fg2">查询成功，但没有返回任何行。</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-panel2">
          <tr>
            {result.columns.map((c, i) => (
              <th key={i} className="border-b border-line px-3 py-2 font-mono font-semibold text-fg2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, ri) => (
            <tr key={ri} className="bg-panel even:bg-panel2/40">
              {row.map((cell, ci) => (
                <td key={ci} className="border-b border-line px-3 py-2 font-mono text-fg">
                  {cell === null ? <span className="text-fg3">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
