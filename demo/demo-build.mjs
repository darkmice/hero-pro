// GitHub Pages 静态演示构建脚本（只构建演示，不部署）。
//
// 用法（必须用 bun 运行，Bun.build 是 bun 专属；必须以 demo/ 目录为
// cwd 跑——教训：别的 cwd 跑，Tailwind 内容扫描口径不同，产物内容
// md5 对不上，JS 差 4 字节、CSS 差 14KB）：
//   cd demo && bun demo-build.mjs [--root <仓库根目录>] [--out <输出目录>]
// 默认 --root 为仓库根（demo/ 的上一级），默认 --out 为仓库根下的
// demo-dist/。
//
// 做法：把 demo/demo-main.tsx 与 demo/demo-index.html 暂存进目标根目录
// 下的 demo-staging/（因为演示入口要按相对路径 import 目标树里的
// client/src/pages/ComponentLibraryPage 与 theme.css），再用与 SDK
// buildClient() 相同的 Bun.build 配置（entry 为 HTML、minify、
// NODE_ENV=production、tailwind 插件、同名 naming、导入资产重加
// ./assets/ 前缀）打出静态 dist；构建完删掉 demo-staging/。
// 不推 GitHub（部署由 .github/workflows/deploy-demo.yml 在 Actions 里做）。
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

if (typeof Bun === "undefined" || typeof Bun.build !== "function") {
  console.error("demo-build.mjs 必须用 bun 运行：cd demo && bun demo-build.mjs [--root <仓库根目录>]");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const root = resolve(getArg("--root", repoRoot));
const outdir = resolve(getArg("--out", join(repoRoot, "demo-dist")));
const staging = join(root, "demo-staging");

const page = join(root, "client/src/pages/ComponentLibraryPage.tsx");
try {
  await readFile(page, "utf8");
} catch {
  console.error(`库页源码不存在：${page}。--root 应指向仓库根目录。`);
  process.exit(1);
}

await rm(staging, { force: true, recursive: true });
await mkdir(staging, { recursive: true });
try {
  await cp(join(here, "demo-main.tsx"), join(staging, "demo-main.tsx"));
  await cp(join(here, "demo-index.html"), join(staging, "demo-index.html"));

  const requireFromRoot = createRequire(join(root, "package.json"));
  const tailwindPlugin = requireFromRoot("bun-plugin-tailwind").default;
  // 仓库里没有 space.json（那是 live 控制台的元数据，不属于快照导出）；
  // __HATCH_SPACE_PLATFORM_VERSION__ 在 demo 闭包里只有一个引用点：
  // SDK 的 READABLE_FAILURES = (v >= 29)，v126 live 的 space.json 是 31。
  // 缺省为 31：任何 >= 29 的值产物都逐字节相同（对照实验 A 证实：缺省 0
  // 时 JS 仅差 1 字节 Oge=!1 vs !0；改 31 后与 v126 逐字节一致）。
  const platformVersion = await readFile(join(root, "space.json"), "utf8")
    .then((t) => JSON.parse(t).platformVersion)
    .catch(() => 31);

  await rm(outdir, { force: true, recursive: true });
  const result = await Bun.build({
    entrypoints: [join(staging, "demo-index.html")],
    outdir,
    minify: true,
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      __HATCH_SPACE_PLATFORM_VERSION__: JSON.stringify(typeof platformVersion === "number" ? platformVersion : 0),
    },
    naming: {
      asset: "assets/[name]-[hash].[ext]",
      chunk: "assets/[name]-[hash].[ext]",
      entry: "[name].[ext]",
    },
    plugins: [tailwindPlugin],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("demo Bun.build 失败，见上");
  }
  // 与 SDK buildClient() 同款：导入资产的裸 ./<file> 引用重加 ./assets/ 前缀。
  const assetFiles = result.outputs
    .filter((o) => o.kind === "asset")
    .map((o) => basename(o.path));
  for (const output of result.outputs) {
    if (!/\.(js|css|html)$/.test(output.path)) continue;
    let text = await output.text();
    let changed = false;
    for (const name of assetFiles) {
      const bare = `./${name}`;
      if (text.includes(bare)) {
        text = text.split(bare).join(`./assets/${name}`);
        changed = true;
      }
    }
    if (changed) await writeFile(output.path, text);
  }
  console.log(`演示 dist 已生成：${outdir}`);
  for (const o of result.outputs) console.log(`  ${o.path} (${o.size} bytes)`);
  // 入口改名：构建产物叫 demo-index.html，GitHub Pages 与静态服务认的是
  // index.html；内部引用全是相对 ./assets/，改名不影响资源路径。
  const builtHtml = join(outdir, "demo-index.html");
  const indexHtml = join(outdir, "index.html");
  await cp(builtHtml, indexHtml);
  await rm(builtHtml, { force: true });
  console.log(`  入口已改名：demo-index.html -> index.html`);
} finally {
  await rm(staging, { force: true, recursive: true });
}
