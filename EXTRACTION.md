# 抽取清单 EXTRACTION.md（hero-pro main 快照导出，v126）

来源：live 控制台树 `~/workspace/ts-spaces/tg-qun-zu-cha-sha-ping-tai`，
v126（`built_at 2026-11-26T06:30:52Z`、sha `2e3c9dfe…`）。
抽取时 live 未动：库页 md5 抽取前后均为 `0084a2cf…`，无 demo-staging 残留。

## 原样复制（逐字节，md5 与 live 一致）

| 文件 | 行数 | md5 |
|---|---|---|
| client/src/pages/ComponentLibraryPage.tsx | 3339 | 0084a2cf611e2bc1e828d591c6bc6b85 |
| client/src/pages/ComponentLibraryPage.test.ts | 167 | 9cef916df33547182b9231fa58e4a4ef |
| client/src/components/ui.tsx | 631 | 86e4ff327ff42a4a3f3f11f492d2f3e4 |
| client/src/components/cellRows.tsx | 264 | 68d62bbc1557ae71765300f85c663ff8 |
| client/src/components/kpi.tsx | 297 | 076207de8912b79053a381cf5a25fa4f |
| client/src/components/charts.tsx | 102 | c9662a3739c0500c0fc4b0692caef058 |
| client/src/themeController.tsx | 63 | 9168eb63812788e27631ecb668b1d20c |
| client/src/route.ts | 156 | b7119f8fd43c6680b86617caf5388970 |
| client/src/theme.css | 192 | b8e3b5a92a2a1869a8d17a40f655abbf |
| client/src/globals.d.ts | 2 | e4e2b1c3aff8bade544d11c0f9c253b9 |
| demo/demo-index.html | — | 与原 demo 文件一致（未改） |

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
  @heroui/styles、@tanstack/react-query、recharts；dev：tailwindcss、tailwindcss-safe-area、
  bun-plugin-tailwind、typescript、@types/*）。`overrides` 把进 bundle 的传递依赖钉在
  live 的版本（d3-* 11 个 + @babel/runtime 7.29.10），否则全新安装浮到新 patch 会多出
  约 16KB、偏离已验证的 v126。不含 @hatch/space-sdk、drizzle-orm、@tanstack/react-table、
  @tanstack/react-form、zod。
- `.github/workflows/deploy-demo.yml`：新建（见 README 发布流程）。
- `README.md` / `.gitignore`：新建。

## 明确排除（不在抽取范围，原因）

- `App.tsx`、`api.ts`、`main.tsx`、`shell.tsx`、`overviewLogic.ts`、`server/`、
  其他控制台页、Bot 代码：控制台业务，不带。
- `components/widget.tsx`、`dataTable.tsx`、`itemCard.tsx`、`formValidation.ts`、
  `components/ErrorBoundary.tsx`：**不在 import 闭包里**——全树 import 追踪证实库页及其
  传递依赖从未 import 它们（见 `import-trace.txt`）。任务书括号里列为“共享组件”举例，
  以追踪为准：带进来是死代码，不带。它们仍在 live 里，库页要用时再随闭包导出。
- `client/src/assets/logo.webp`：控制台 favicon，demo 不用（demo-index.html 用空 data URI）。
- `space.json`、`app.db`、`.space-build/`：live 元数据/数据/构建产物，不属于快照。
- `route.ts` 只以 `import type { RouteTab }` 进闭包：其余运行时函数（parseHash 等）
  在产物 JS 里 0 命中，已 tree-shake，不构成业务逻辑泄漏。

## 产物基线（去 SDK 化后的新基线，见实施报告 §4 的说明）

- JS：1,471,455 字节，md5 `beffdb78d26541cb90a0e94720b2f9c0`
  （v126：1,478,747 字节，`a0af265b…`；差 −7,292 字节 = 移除的 SDK 客户端代码）
- CSS：831,288 字节，md5 `bfbef93fea27d999daf0a0017ad6b6d9`
  （v126：832,757 字节，`80269baa…`；差 −1,469 字节 = 恰好 SDK 的容器样式块）
- index.html：1,116 字节（内容除 JS 文件名 hash 外与 v126 相同）
- 探针：主题切换 7/0，样式修复 20/0/1（M-2 头像 G 仍 OPEN）
- 组件测试：`bun test` 15 pass / 0 fail
