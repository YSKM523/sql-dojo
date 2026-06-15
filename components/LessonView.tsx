import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function LessonView({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-pre:bg-slate-900 prose-code:text-sky-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
