# SQL 道场 · SQL Dojo

在浏览器里跑**真实 Postgres**，边练边和 AI 结对，帮中文小白从 `SELECT *` 一路练到能读执行计划、做留存/漏斗分析的 **senior SQL 工程师**。

**🔗 在线体验：https://sql-dojo.pp-account.workers.dev**

## 特色

- 🧪 **浏览器内真 Postgres**（[PGlite](https://pglite.dev)/WASM）：写完即跑、即时判对错，零后端成本
- 🤖 **AI 副驾**（规划中）：自然语言 ↔ SQL、渐进式提示、查询解释 —— vibe coding 式学习
- 📈 **课程路线图**：从入门到窗口函数、`EXPLAIN` 执行计划、留存/漏斗实战
- 🎯 **全程动手**：每个知识点都配可运行的练习，不是看视频

## 技术栈

Next.js 16 (App Router) · TypeScript · Tailwind v4 · CodeMirror 6 · PGlite · Vitest · Cloudflare Workers (OpenNext)

## 本地开发

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest（含真实 PGlite 判题测试）
npm run build
npm run deploy   # 部署到 Cloudflare（需 wrangler 登录）
```

> 浏览器端的 PGlite wasm/data 资源由 `npm run copy:pglite`（已挂在 `predev`/`prebuild`）从 `node_modules` 复制到 `public/pglite/`，运行时同源加载。

## 路线图

- ✅ **Phase 1** —— 练习场内核：PGlite 判题（结果集比对）+ 模块一样例题，已上线
- ⏳ **Phase 2** —— 模块 1–4 全题库 + MDX 课程 + 段位路线图
- ⏳ **Phase 3** —— 邮箱登录 + 进度云同步
- ⏳ **Phase 4** —— Claude AI 副驾

设计文档与实现计划见 [`docs/superpowers/`](docs/superpowers/)。

## 作者与许可

作者 **YSKM523** · [MIT License](LICENSE)
