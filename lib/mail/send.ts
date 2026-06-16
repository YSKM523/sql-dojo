import type { Fetcher } from '@cloudflare/workers-types';

export interface MailEnv {
  MAIL: Fetcher;
  MAIL_API_SECRET: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// 经 service binding 调 lakebbs-mail 的 POST /send 发一封事务邮件。失败抛错。
// 用 service binding 而非 fetch(workers.dev)：同账号 Worker→Worker 走公网 workers.dev
// 子请求会被 Cloudflare 拦截；service binding 是标准且更快的同账号互调机制。
// host 部分任意（绑定按 pathname 路由到 lakebbs-mail，其只认 /send）。
export async function sendMail(env: MailEnv, msg: MailMessage): Promise<void> {
  const res = await env.MAIL.fetch('https://lakebbs-mail/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.MAIL_API_SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`mail send failed: ${res.status} ${detail}`);
  }
}
