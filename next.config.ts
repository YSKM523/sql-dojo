import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // home 目录另有 package-lock.json，显式钉死工作区根，避免 Turbopack 误判。
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
