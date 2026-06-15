// 把 PGlite 运行所需的 ESM + chunks + wasm/data 复制到 public/pglite/。
// 浏览器在运行时 import('/pglite/index.js') 这份"未经打包器处理"的原始 ESM，
// 由它自己相对加载 ./pglite.wasm 等资源。
// 原因：Turbopack 生产构建会把 PGlite 的 Emscripten 胶水 minify 坏（instantiateWasm 丢失）；
// 同源自托管又避免了 jsdelivr 在中国大陆不稳定的问题。
// 只留 .js/.wasm/.data，去掉 source map、.d.ts、.cjs、以及用不到的 contrib 扩展 .tar.gz。
import { readdirSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'node_modules/@electric-sql/pglite/dist');
const dst = join(root, 'public/pglite');

const keep = (name) => /\.(js|wasm|data)$/.test(name); // .js.map 以 .map 结尾，不会命中

mkdirSync(dst, { recursive: true });
let count = 0;
for (const name of readdirSync(src)) {
  const p = join(src, name);
  if (statSync(p).isFile() && keep(name)) {
    copyFileSync(p, join(dst, name));
    count++;
  }
}
console.log(`copied ${count} PGlite runtime files -> ${dst}`);
