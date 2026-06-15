import type { NextConfig } from "next";
import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// 让 `next dev` 也能通过 getCloudflareContext() 读到 .dev.vars 与本地 KV 绑定。
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // home 目录另有 package-lock.json，显式钉死工作区根，避免 Turbopack 误判。
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
