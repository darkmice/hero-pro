# 抽取清单 EXTRACTION.md（hero-pro main 快照导出，v133）

来源：live 控制台树 `~/workspace/ts-spaces/tg-qun-zu-cha-sha-ping-tai`，
v133（抽取时 live 库页 md5 `82fd3a92…`）。
抽取时 live 未动：库页 md5 抽取前后均为 `82fd3a92…`，无 demo-staging 残留。

## 原样复制（逐字节，md5 与 live 一致）

| 文件 | 行数 | md5 |
|---|---|---|
| client/src/pages/ComponentLibraryPage.tsx | 3594 | 82fd3a92f5ebc983dead327dad693313 |
| client/src/pages/ComponentLibraryPage.test.ts | 218 | e8503b467d65e4d01a3d0dc023426115 |
| client/src/components/ui.tsx | 631 | 86e4ff327ff42a4a3f3f11f492d2f3e4 |
| client/src/components/cellRows.tsx | 264 | 68d62bbc1557ae71765300f85c663ff8 |
| client/src/components/kpi.tsx | 297 | 076207de8912b79053a381cf5a25fa4f |
| client/src/components/charts.tsx | 102 | c9662a3739c0500c0fc4b0692caef058 |
| client/src/components/dataTable.tsx | 517 | 7ba9253a74d1f9cf819cdfa260a61893 |
| client/src/themeController.tsx | 63 | 9168eb63812788e27631ecb668b1d20c |
| client/src/route.ts | 156 | b7119f8fd43c6680b86617caf5388970 |
| client/src/theme.css | 204 | 038d851fb11b4b1988fa0d818fdc1b0c |
| client/src/globals.d.ts | 2 | e4e2b1c3aff8bade544d11c0f9c253b9 |
| demo/demo-index.html | — | 与原 demo 文件一致（未改） |

## v133 闭包变化（相对 v126 导出）

- **新增 `components/dataTable.tsx`**：v133 库页改用 TanStack Table 数据层
  （`useAppTable` / `TableHead` / `makeSortingChangeHandler` 等），直接
  import `../components/dataTable` 与 `@tanstack/react-table`。没有它构建
  失败（`Could not resolve: "@tanstack/react-table"`、
  `Cannot find module '../components/dataTable'`）。v126 导出把它列为排除项
  是当时的追踪结论，v133 已失效，以本次追踪为准。
- **`components/charts.tsx` 仍在库页闭包内**：库页经 `kpi.tsx` 使用它
  （`kpi.tsx:17` import `{ ChartTooltipCard, chartTheme }`，迷你图悬停 tooltip 与
  cursor 配色走它）；库页本身 7 张图直接用 Recharts，但删掉 charts 构建失败。
  （核查订正：初版误写为“已出闭包”，以本次为准。）
- 其余 7 个原样文件与 v126 导出逐字节一致（见实施报告 §1）。

## 改动过的文件（相对 live / 原 demo，有意改动）

- `demo/demo-main.tsx`：去 SDK 化。原 `import { spaceQueryClient } from "@hatch/space-sdk/client"`
  改为普通的 TanStack `new QueryClient({ defaultOptions: { queries: { staleTime: 30_000,
  refetchOnWindowFocus: false } } })`。核实依据见实施报告 §2：SDK 的 spaceQueryClient
  本质就是该 QueryClient + demo 用不到的 mutation 失败提示与重试策略；闭包里没有任何
  useQuery / useMutation / api 调用。
- `demo/demo-build.mjs`：按仓库布局适配。默认 `--root` 改为仓库根（demo/ 的上一级），
  默认 `--out` 为仓库根下的 `demo-dist/`；space.json 缺失时 platformVersion 缺省为 31
  （原脚本读 live 的 space.json 得 31；SDK 只用 `v >= 29` 这一位，任何 ≥29 的值产物相同；
  缺省 0 时 JS 仅差 1 字节，对照实验 A 证实）。其余构建配置与原脚本一字不变。
- `package.json` / `bun.lock`：新建，只含 demo 依赖（react、react-dom、@heroui/react、
  @heroui/styles、@tanstack/react-query、@tanstack/react-table 9.3.1、recharts；
  dev：tailwindcss、tailwindcss-safe-area、
  bun-plugin-tailwind、typescript、@types/*）。`overrides` 把进 bundle 的传递依赖钉在
  live 的版本（d3-* 11 个 + @babel/runtime 7.29.10 + @tanstack/table-core 9.3.1 +
  @tanstack/react-store 0.11.4），否则全新安装浮到新 patch 会多出
  约 16KB、偏离已验证的 v133 基线。不含 @hatch/space-sdk、drizzle-orm、
  @tanstack/react-form、zod。干净安装实测 99 包（v126 的 95 包 + react-table
  一家 4 包）。
- `.github/workflows/deploy-demo.yml`：新建（见 README 发布流程）。
- `README.md` / `.gitignore`：新建。

## 明确排除（不在抽取范围，原因）

- `App.tsx`、`api.ts`、`main.tsx`、`shell.tsx`、`overviewLogic.ts`、`server/`、
  其他控制台页、Bot 代码：控制台业务，不带。
- `components/widget.tsx`、`itemCard.tsx`、`formValidation.ts`、
  `components/ErrorBoundary.tsx`：**不在 import 闭包里**——全树 import 追踪证实库页及其
  传递依赖从未 import 它们。它们仍在 live 里，库页要用时再随闭包导出。
  （`dataTable.tsx` 在 v126 时也在这类里，v133 已进闭包，见上节，不再排除。）
- `client/src/assets/logo.webp`：控制台 favicon，demo 不用（demo-index.html 用空 data URI）。
- `space.json`、`app.db`、`.space-build/`：live 元数据/数据/构建产物，不属于快照。
- `route.ts` 只以 `import type { RouteTab }` 进闭包：其余运行时函数（parseHash 等）
  在产物 JS 里 0 命中，已 tree-shake，不构成业务逻辑泄漏。

## 产物基线（去 SDK 化后的新基线，见实施报告 §4 的说明）

- JS：1,588,976 字节，md5 `01c10d47c6484c65ac61544ecb732a8c`
  （v133 SDK demo：1,596,271 字节，`8a283535…`；差 −7,295 字节 = 移除的 SDK 客户端代码；
  与 v126 的 −7,292 差 3 字节，系 Bun minifier 全局重命名噪声，见实施报告 §4）
- CSS：836,015 字节，md5 `bd598fcf94fbc60daf15c3de22cf40c7`
  （v133 SDK demo：837,484 字节，`f3a1a392…`；差 −1,469 字节 = 恰好 SDK 的容器样式块，
  与 v126 的差值逐字节一致）
- index.html：1,116 字节（内容除 JS/CSS 文件名 hash 外与 v126 相同）
- 探针：本批未跑（任务书未要求）；v126 探针结论见上次实施报告（主题切换 7/0，
  样式修复 20/0/1，M-2 头像 G 仍 OPEN）
- 组件测试：`bun test` 20 pass / 0 fail
