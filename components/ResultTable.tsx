import type { ResultSet } from '@/lib/sql/types';

export function ResultTable({ result }: { result: ResultSet }) {
  if (result.rows.length === 0) {
    return <p className="text-sm text-slate-400">查询成功，但没有返回任何行。</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-900">
          <tr>
            {result.columns.map((c, i) => (
              <th
                key={i}
                className="border-b border-slate-700 px-3 py-2 font-mono text-slate-200"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, ri) => (
            <tr key={ri} className="odd:bg-slate-950 even:bg-slate-900">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-b border-slate-800 px-3 py-2 font-mono text-slate-300"
                >
                  {cell === null ? <span className="text-slate-600">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
