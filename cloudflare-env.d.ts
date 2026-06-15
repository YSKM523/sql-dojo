interface CloudflareEnv {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  AI_RATELIMIT?: import('@/lib/ai/ratelimit').KVLike;
}
