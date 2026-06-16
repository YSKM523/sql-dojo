# SQL 道场 — 前端重设计（Cloudflare 控制台风）设计文档

- 日期：2026-06-16
- 状态：已通过头脑风暴（含可视化目标稿）确认，待进入实现计划
- 前置：全部功能（练习场/8 模块/AI 副驾/登录+D1/进度）已上线；本次只改"长相"，不改行为

---

## 1. 目标

把现有"通用深色"前端重做成一套**统一的 Cloudflare 控制台风设计系统**：浅色为主、可切深色，Cloudflare 招牌橙做主色、蓝色做链接，白卡 + 1px 细边 + 极轻阴影、信息密度高、清晰层级、**纯色无渐变**、**无任何 emoji（统一用 Lucide 线性图标）**、字体贴近 CF（用 **Inter**）。

用户已在可视化目标稿确认方向（练习页方向 A 浅色 → 路线图目标稿"就按这个来"），范围=**全部用户页一次性重做**，品牌力度=**尽量像 CF 控制台**，并要**浅色 + 深色切换开关**。

## 2. 设计系统（tokens）

在 `app/globals.css` 用 CSS 变量定义两套主题，挂在 `<html data-theme="light|dark">` 上（默认 light）。Tailwind v4 用 `@theme inline` 把这些变量暴露成工具类色（`bg-surface` / `text-muted` 等），组件统一引用语义 token，不再散落 `slate-900` 等硬编码。

**浅色（默认）：**
| token | 值 | 用途 |
|---|---|---|
| `--bg` | `#f1f3f5` | 页面底 |
| `--surface` | `#ffffff` | 卡片/栏 |
| `--surface-2` | `#f6f7f8` | 表头/次级面 |
| `--border` | `#e3e5e8` | 细边 |
| `--text` | `#1f2933` | 主文字 |
| `--text-2` | `#5b6573` | 次文字 |
| `--text-muted` | `#8a929e` | 弱文字 |
| `--primary` | `#f6821f` | CF 橙，主按钮/选中/进度 |
| `--primary-hover` | `#e0700f` | 橙 hover |
| `--link` | `#0051c3` | 链接蓝 |
| `--success` | `#0a7f47` / 浅底 `#e7f6ee` | 判对 |
| `--danger` | `#bd2719` / 浅底 `#fdecea` | 判错/报错 |
| `--shadow` | `0 1px 2px rgba(20,30,50,.05)` | 卡片轻阴影 |

**深色：**
`--bg #15171c`、`--surface #1c1f26`、`--surface-2 #161b25`、`--border #2a2e36`、`--text #eef2f8`、`--text-2 #9aa4b2`、`--text-muted #6b7585`、`--primary` 同橙、`--link #5aa2ff`、success/danger 用深底浅字版、`--shadow none`。

**段位徽章**保留可区分的实色（利于扫读），统一成扁平实色 pill：beginner 翠绿 `#1f9d6b`、intermediate 琥珀 `#c77d11`、advanced 橙 `#e07410`、senior 红 `#e0431f`、sprint 蓝 `#2c7cd6`（两主题通用，文字白）。

## 3. 字体与图标

- **字体**：`next/font/google` 引 **Inter**（含中文回退 PingFang/系统）做 `--font-sans`，替换 Geist Sans；代码/等宽保留 `Geist Mono` 作 `--font-mono`。（Inter 是 CF 自有字体最接近的开源替代。）
- **图标**：引 **`lucide-react`**，**移除全站 emoji**，逐一替换：
  - logo `🐎` → 橙色圆角方块内置 `Database` 图标（白）+「SQL 道场」字标
  - 运行 `▶` → `Play`；判对 `✅` → `CheckCircle2`；判错/报错 `❌` → `XCircle`
  - AI 三键 `💡🔍🐞` → `Lightbulb` / `Search` / `Bug`
  - 进度 `✓` → `Check`；主题开关 → `Sun` / `Moon`
  - 其余零散 emoji（落地页 CTA、面包屑箭头等）→ 对应 Lucide 图标或纯文字
- 全局自检：`grep` 确认源码无残留 emoji（题库内容里的中文标点不算）。

## 4. 主题切换

- `components/ThemeToggle.tsx`（客户端）：`Sun`/`Moon` 按钮，切换 `<html>` 的 `data-theme`，写 `localStorage('sqldojo:theme')`，默认 light。
- **防闪烁**：`app/layout.tsx` 的 `<head>` 内联一段小脚本，首帧前读 localStorage 设好 `data-theme`（避免浅→深闪一下）。
- 放进顶栏右侧（见 §5 Topbar）。

## 5. 受影响范围（全部用户页 + 组件）

**全局：**
- `app/globals.css` —— 重写为 token 系统（两主题）。
- `app/layout.tsx` —— Inter 字体、防闪烁脚本、挂新 **Topbar**。
- **新建 `components/Topbar.tsx`** —— CF 风顶栏：左 logo（Database 图标 + 字标）、导航（学习路线图 / 我的足迹，选中态橙色下划线）、右 `ThemeToggle` + 登录态（复用现有 `useSession`：登录显示邮箱 + 退出，游客显示「登录」橙按钮）。**取代现有 `AuthBadge`**（其逻辑并入 Topbar）。
- **新建 `components/ThemeToggle.tsx`**。

**页面：**
- `app/page.tsx`（落地页）—— CF hero：左对齐标题/副标题、主 CTA（橙）+ 次 CTA（描边），干净。
- `app/learn/page.tsx` —— 面包屑 + 标题 + CF 卡网格（照目标稿）。
- `app/learn/[moduleId]/page.tsx` —— 模块概览（概念课 + 习题列表）CF 化。
- `app/exercise/[id]/page.tsx` —— **核心页**：题面卡 + 编辑器 + 运行按钮 + 判题条 + 结果表 + AI 面板 + 上下题导航，全部 CF 化。
- `app/me/page.tsx` —— 足迹页（进度条/模块列表）CF 化。
- `app/login/page.tsx` —— 登录表单 CF 化。

**组件：**
- `ModuleCard`、`ModuleProgressBadge`、`ExerciseList`/`ExerciseListClient`、`VerdictBanner`、`ResultTable`、`AiCopilot`、`LessonView`、`ExerciseNavBar` —— 改用 token + Lucide 图标。
- `SqlEditor`（CodeMirror）—— 见 §6。

## 6. 代码编辑器（CodeMirror）

编辑器在**两种主题下都保持深色**（CF 代码块就是深色嵌入；浅色页里深色编辑器=经典 inset，目标稿已确认）。给它一个干净的深色主题（沿用现有 `@uiw/react-codemirror`，配 `theme` 或 `@uiw/codemirror-theme-*`），与 token 的深色面板协调。结果表/题面随主题切换，编辑器恒深。

## 7. 约束

- **纯色无渐变**（全局硬规则）。
- **零 emoji**（全用 Lucide）。
- **只改长相、不改行为**：判题、进度、AI、登录、路由全不动；仅替换/重排样式与图标、引入主题。
- Tailwind v4 动态类陷阱：段位色等用**完整静态类名或 token**，不拼接（沿用现有 `ModuleCard` 的 `Record` 写法）。

## 8. 测试

- **现有单测/组件测试全过**：重设主要动 className/图标，不应改变组件行为与可见文案；如某测试断言了旧文案里的 emoji（如 VerdictBanner 的 `✅`），同步更新该断言到新图标对应的可访问文案（如 `aria-label`/文字"通过"）。
- **构建干净** `npm run build`、`npx tsc --noEmit`。
- **可视化验收**：真浏览器逐页截图，浅色 + 深色各一遍；确认主题切换生效且防闪烁、全站无 emoji、布局/层级符合目标稿；线上部署后再抽查。

## 9. 验收标准

- 全部 7 个页面 + 顶栏呈 CF 控制台风（浅色），主题开关可切深色且刷新不丢、不闪；CF 橙主色 + 蓝链 + 白卡细边一致。
- 全站无 emoji，图标统一 Lucide；正文 Inter、代码等宽。
- 所有原功能照常（解题判对错、进度、AI、登录、导航）。
- `npx vitest run` 全绿、`tsc` 干净、`npm run build` 成功、线上可访问。

## 10. 非目标

- 不加新功能/新页面/新内容（纯视觉）。
- 不把代码编辑器改成浅色。
- 不做动画/花哨过渡（克制，最多极轻 hover/选中态）。
- 不引入重型 UI 组件库（只加 lucide-react + Inter；样式用 Tailwind token）。

## 11. 风险与对策

| 风险 | 对策 |
|---|---|
| 触及文件多、易遗漏某页/组件残留旧深色硬编码 | 以 token 收口；最后 `grep` 扫 `slate-`/emoji/硬编码色查残留；逐页截图核对 |
| Tailwind v4 自定义 token 接法 | 用 `@theme inline` 暴露 CSS 变量为色类；实现期查 tailwind v4 文档 |
| 主题切换首帧闪烁 | `<head>` 内联脚本先于渲染设 `data-theme` |
| 组件测试断言旧 emoji 文案 | 同步更新断言到新图标的 aria-label/文字；行为断言不动 |
| 视觉非 TDD、靠人眼 | 浅/深逐页截图 + 与目标稿比对，必要时迭代；可派视觉 reviewer |
| Inter 中文字形 | Inter 仅覆盖拉丁，中文走系统回退（PingFang SC / 思源），在 font stack 里显式兜底 |
