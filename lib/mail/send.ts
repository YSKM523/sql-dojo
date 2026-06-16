export interface MailEnv {
  MAIL_API_URL: string;
  MAIL_API_SECRET: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** 调 lakebbs-mail worker 的 POST /send 发一封事务邮件。失败抛错。 */
export async function sendMail(env: MailEnv, msg: MailMessage): Promise<void> {
  const res = await fetch(`${env.MAIL_API_URL}/send`, {
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
