import type { ChatMessage } from './prompts';

const ENDPOINT = 'https://api.deepseek.com/chat/completions';

export interface DeepSeekOpts {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export async function askDeepSeek(messages: ChatMessage[], opts: DeepSeekOpts): Promise<string> {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? 'deepseek-v4-pro',
      messages,
      max_tokens: opts.maxTokens ?? 1024,
      stream: false,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`DeepSeek ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  // 只取最终答案 content，绝不返回 reasoning_content（思考型模型的推理可能含完整答案）。
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('DeepSeek 返回空内容');
  return content;
}
