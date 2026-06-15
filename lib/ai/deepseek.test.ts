import { describe, it, expect, vi, afterEach } from 'vitest';
import { askDeepSeek } from '@/lib/ai/deepseek';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: (url: string, init: RequestInit) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => Promise.resolve(impl(url, init))),
  );
}

describe('askDeepSeek', () => {
  it('用 Bearer key + 模型发请求，返回 content', async () => {
    let seen: { url: string; init: RequestInit } = { url: '', init: {} };
    stubFetch((url, init) => {
      seen = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: '答案' } }] }), {
        status: 200,
      });
    });
    const out = await askDeepSeek([{ role: 'user', content: 'hi' }], {
      apiKey: 'sk-x',
      model: 'deepseek-v4-pro',
    });
    expect(out).toBe('答案');
    expect(seen.url).toContain('api.deepseek.com');
    expect((seen.init.headers as Record<string, string>).Authorization).toBe('Bearer sk-x');
    expect(JSON.parse(seen.init.body as string).model).toBe('deepseek-v4-pro');
  });

  it('HTTP 非 2xx 抛错', async () => {
    stubFetch(() => new Response('boom', { status: 500 }));
    await expect(
      askDeepSeek([{ role: 'user', content: 'hi' }], { apiKey: 'sk-x' }),
    ).rejects.toThrow();
  });

  it('content 为空抛错', async () => {
    stubFetch(
      () => new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }),
    );
    await expect(
      askDeepSeek([{ role: 'user', content: 'hi' }], { apiKey: 'sk-x' }),
    ).rejects.toThrow();
  });
});
