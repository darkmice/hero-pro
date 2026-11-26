/* GitHub Pages 静态演示入口：只渲染组件库页本身（import 的就是
 * client/src/pages/ComponentLibraryPage，与控制台里的是同一份代码，
 * 不是复制的一套演示实现）。全部 mock 数据，不调任何后端接口。
 *
 * Providers 与 live 的 main.tsx 保持一致（QueryClientProvider +
 * ThemeController + ToastProvider + theme.css），只是 App 换成
 * ComponentLibraryPage；navigate 在静态演示里只处理 library（回顶），
 * 其他 tab 弹一条说明（演示里没有产品页）。
 * 主题切换（2026-11-26）：独立 demo 的 ComponentLibraryPage 传
 * standalone，页首渲染浅/深色切换按钮（控制台里的库页页签不传，
 * 不重复加切换——顶栏已有）。demo-index.html 的防闪脚本不用改。
 *
 * 去 SDK 化（Actions 迁移，2026-11-26）：原来这里 import
 * @hatch/space-sdk/client 的 spaceQueryClient——那是本地 Hatch SDK
 *（file: 依赖，GitHub Actions 环境里没有）。核实结论：SDK 的
 * spaceQueryClient 本质就是一个普通的 TanStack QueryClient，只加了
 * 两处 demo 用不到的东西——mutationCache 失败提示（demo 不发任何
 * mutation）与“只重试服务端动作错误”的 retry 策略（demo 不发任何
 * query）；闭包里没有任何 useQuery / useMutation / api 调用（grep
 * 为证）。所以这里直接 new 一个普通 QueryClient，并保留 SDK 两处
 * 对 demo 可观测的默认值：staleTime 30_000、refetchOnWindowFocus
 * false。SDK 模块的两个副作用（audit settle 探针、host 主题监听）
 * 在无宿主的静态演示里是 no-op，探针已验证主题切换行为不变。
 * 注意：live 控制台仍用 spaceQueryClient，本文件只属于 demo。
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider, toast } from "@heroui/react";
import { ThemeController } from "../client/src/themeController";
import { ComponentLibraryPage } from "../client/src/pages/ComponentLibraryPage";
import "../client/src/theme.css";

const demoQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const rootEl = document.querySelector<HTMLElement>("[data-demo-root]");
if (!rootEl) {
  throw new Error("missing demo root element");
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={demoQueryClient}>
      <div className="hatch-space-root" data-hatch-space-root>
        <ThemeController />
        <ToastProvider placement="bottom" />
        <ComponentLibraryPage
          standalone
          navigate={(t) => {
            if (t === "library") {
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            toast.info("静态演示仅含组件库页（mock 数据，不调后端接口）。");
          }}
        />
      </div>
    </QueryClientProvider>
  </StrictMode>,
);
