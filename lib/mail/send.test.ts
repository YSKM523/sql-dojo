import { describe, it, expect, vi } from 'vitest';
import { sendMail } from '@/lib/mail/send';

const msg = { to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't' };

function envWith(fetchImpl: ReturnType<typeof vi.fn>) {
  return { MAIL: { fetch: fetchImpl } as never, MAIL_API_SECRET: 'secret' };
}

describe('sendMail', () => {
  it('经 MAIL 绑定 POST /send 带 Bearer 与 body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"messageId":"x"}', { status: 200 }));
    await sendMail(envWith(fetchMock), msg);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/send');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret');
    expect(JSON.parse(init.body as string)).toMatchObject(msg);
  });

  it('非 2xx 抛错', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 502 }));
    await expect(sendMail(envWith(fetchMock), msg)).rejects.toThrow(/mail send failed/);
  });
});
