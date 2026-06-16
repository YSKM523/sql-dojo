import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendMail } from '@/lib/mail/send';

const env = { MAIL_API_URL: 'https://mail.example.com', MAIL_API_SECRET: 'secret' };
const msg = { to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't' };

afterEach(() => vi.restoreAllMocks());

describe('sendMail', () => {
  it('POST 到 /send 带 Bearer 与 body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"messageId":"x"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await sendMail(env, msg);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://mail.example.com/send');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret');
    expect(JSON.parse(init.body as string)).toMatchObject(msg);
  });

  it('非 2xx 抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 502 })));
    await expect(sendMail(env, msg)).rejects.toThrow(/mail send failed/);
  });
});
