interface CloudflareEnv {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  AI_RATELIMIT?: import('@/lib/ai/ratelimit').KVLike;
  DB?: import('@cloudflare/workers-types').D1Database;
  SESSION_SECRET?: string;
  MAIL_API_URL?: string;
  MAIL_API_SECRET?: string;
}
