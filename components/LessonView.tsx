import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function LessonView({ markdown }: { markdown: string }) {
  return (
    <div className="prose max-w-none prose-pre:rounded-md prose-code:font-mono">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
