export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildOtpEmail(code: string): MailContent {
  const subject = `SQL 道场登录验证码：${code}`;
  const text =
    `你的 SQL 道场登录验证码是 ${code}，10 分钟内有效。\n` +
    `如果不是你本人操作，忽略本邮件即可。`;
  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;` +
    `max-width:480px;margin:0 auto;padding:24px;color:#0f172a;background:#ffffff">` +
    `<h2 style="margin:0 0 12px;color:#0f172a">SQL 道场</h2>` +
    `<p style="margin:0 0 16px;color:#334155">你的登录验证码：</p>` +
    `<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 16px;` +
    `color:#0f172a;background:#f1f5f9;padding:12px 16px;border-radius:8px;text-align:center">` +
    `${code}</p>` +
    `<p style="margin:0;color:#64748b;font-size:13px">10 分钟内有效。若非本人操作，忽略本邮件即可。</p>` +
    `</div>`;
  return { subject, html, text };
}
