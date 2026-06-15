'use client';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';

export function SqlEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-800">
      <CodeMirror
        value={value}
        height="180px"
        theme="dark"
        extensions={[sql({ dialect: PostgreSQL })]}
        onChange={onChange}
        basicSetup={{ lineNumbers: true }}
      />
    </div>
  );
}
