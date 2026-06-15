import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // 若 PGlite 在测试里报 ESM/WASM 错误，取消下一行注释：
    // server: { deps: { inline: ['@electric-sql/pglite'] } },
  },
});
