# hero-pro · 组件库静态演示

纯组件库快照导出：TG 控制台的组件库页（69 个条目）+ 它 import 的共享组件，
全部 mock 数据，不调任何后端接口。部署在 GitHub Pages：https://darkmice.github.io/hero-pro/

## 这不是 live 代码

- **唯一的 live 代码**在本地控制台树 `~/workspace/ts-spaces/tg-qun-zu-cha-sha-ping-tai`。
  改动先走 live，再重新导出到这里；**绝不在 GitHub 上直接改源码**。
- 这里**不含 TG 业务代码**：没有 App.tsx、actions.ts、server/、其他控制台页、Bot 代码。
  抽取范围就是 demo 构建的 import 闭包（见 `EXTRACTION.md`）：
  `client/src/pages/ComponentLibraryPage.tsx` + `components/{ui,cellRows,kpi,charts}.tsx`
  + `themeController.tsx` + `route.ts`（仅 `RouteTab` 类型）+ `theme.css`。
- `demo/demo-main.tsx` 是去 SDK 化的演示入口：live 用 Hatch 本地 SDK 的
  `spaceQueryClient`，Actions 环境里没有那个 SDK；demo 不发任何 query/mutation，
  这里改用普通的 TanStack `QueryClient`（保留 `staleTime: 30_000`、
  `refetchOnWindowFocus: false` 两个默认值）。

## 发布流程（自动）

1. 改 live 控制台源码，重新导出到这里（保持与 live 同步，见上）。
2. 提交到 `main` 分支。
3. 打标签：`git tag demo-v127 && git push origin demo-v127`
   （标签格式 `demo-v*`，数字与 live 版本对应）。
4. GitHub Actions（`.github/workflows/deploy-demo.yml`）自动构建 demo
   并部署到 `gh-pages` 分支。Pages 配置保持 Branch: `gh-pages`，不用改仓库设置。

不需要再手动传文件到 gh-pages。

## 本地构建（验证用）

```bash
bun install
cd demo && bun demo-build.mjs --root .. --out ../demo-dist
# 必须以 demo/ 为 cwd 跑：别的 cwd 跑，Tailwind 内容扫描口径不同，
# 产物内容 md5 对不上（JS 差 4 字节、CSS 差 14KB）。
python3 -m http.server 8536 -d demo-dist
```

产物只有 3 个文件：`index.html` + `assets/` 下一个 JS、一个 CSS。

## 已知未闭项

- M-2 头像 G（共享 `AV_COLORS`，改它会连带改控制台头像）：样式修复批探针里只记录、不计入通过。
