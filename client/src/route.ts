// Hash 路由（redesign D-R1，设计方案 §3.4）：租户控制台 12 个 Tab 与
// URL 一一映射，刷新回到当前页、详情可深链。路由对象是壳子的唯一
// 事实来源，用规范化后的 path 作稳定 key 比较，相同路由不重挂页面；
// 抽屉（DetailPanel / Modal 是页内叠加态）开/关不碰路由、不重挂列表页。
//
// 子页签 / 分区参数（#/loop/cases、#/botcfg/captcha）由路由对象承载，
// 并通过下面的小订阅 store 对外发布：LoopTab / BotConfigPage 的
// in-page 状态仍归各页所有，各页用 useRoute() 订阅即可同步
// （本批只搭壳子与路由，不改各页主体、不改各页组件签名）。
import { useSyncExternalStore } from "react";

export const TAB_KEYS = [
  "overview",
  "queue",
  "bench",
  "loop",
  "policies",
  "groups",
  "botcfg",
  "models",
  "rules",
  "blacklist",
  "logs",
  "library",
] as const;
export type RouteTab = (typeof TAB_KEYS)[number];

// 闭环中心 7 子页签（与 LoopTab 的 loopSection 同一套 key）。
export const LOOP_SECTIONS = [
  "cases",
  "monitor",
  "keywords",
  "runs",
  "verification",
  "appeals",
  "trust",
] as const;
export type LoopSection = (typeof LOOP_SECTIONS)[number];

// Bot 配置 9 分区（与 BotConfigPage 的 BotSection 同一套 key）。
export const BOT_SECTION_KEYS = [
  "basic",
  "profile",
  "kill",
  "captcha",
  "trust",
  "policy",
  "commands",
  "caps",
  "groups",
] as const;
export type BotSection = (typeof BOT_SECTION_KEYS)[number];

export interface ConsoleRoute {
  tab: RouteTab;
  /** #/queue/:id、#/logs/:id 的详情 id；无详情时为 null。 */
  detailId: number | null;
  /** #/loop/<section>；无参数时为 null。 */
  loopSection: LoopSection | null;
  /** #/botcfg/<section>；无参数时为 null。 */
  botSection: BotSection | null;
  /** 规范化后的 path（不含 #），同时是稳定比较 key。 */
  path: string;
  key: string;
}

function routeFromPath(rawPath: string): ConsoleRoute {
  const segs = rawPath.split("/").filter(Boolean);
  const tab: RouteTab = (TAB_KEYS as readonly string[]).includes(segs[0] ?? "")
    ? (segs[0] as RouteTab)
    : "overview";
  let detailId: number | null = null;
  let loopSection: LoopSection | null = null;
  let botSection: BotSection | null = null;
  const second = segs[1];
  if (second !== undefined) {
    if (tab === "queue" || tab === "logs") {
      const n = Number(second);
      if (Number.isInteger(n) && n > 0) detailId = n;
    } else if (
      tab === "loop" &&
      (LOOP_SECTIONS as readonly string[]).includes(second)
    ) {
      loopSection = second as LoopSection;
    } else if (
      tab === "botcfg" &&
      (BOT_SECTION_KEYS as readonly string[]).includes(second)
    ) {
      botSection = second as BotSection;
    }
  }
  // 规范化：非法段丢弃后重建 path，保证 key 稳定
  //（#/queue/abc → /queue，#/loop/bogus → /loop）。
  let path = `/${tab}`;
  if (detailId !== null) path += `/${detailId}`;
  else if (loopSection !== null) path += `/${loopSection}`;
  else if (botSection !== null) path += `/${botSection}`;
  return { tab, detailId, loopSection, botSection, path, key: path };
}

/** 从当前 location.hash 解析路由；空 hash / 未知 Tab 回总览。 */
export function parseHash(): ConsoleRoute {
  const raw =
    typeof window === "undefined"
      ? ""
      : window.location.hash.replace(/^#/, "");
  return routeFromPath(raw || "/overview");
}

/** 构造路由对象（navigate 的唯一入口参数来源）。 */
export function buildRoute(
  tab: RouteTab,
  opts?: {
    detailId?: number | null;
    loopSection?: LoopSection | null;
    botSection?: BotSection | null;
  },
): ConsoleRoute {
  let path = `/${tab}`;
  if ((tab === "queue" || tab === "logs") && opts?.detailId != null) {
    path += `/${opts.detailId}`;
  } else if (tab === "loop" && opts?.loopSection) {
    path += `/${opts.loopSection}`;
  } else if (tab === "botcfg" && opts?.botSection) {
    path += `/${opts.botSection}`;
  }
  return routeFromPath(path);
}

/* ---- 小订阅 store：把当前路由发布给各页（各页用 useRoute() 读
   loopSection / botSection 等参数，不用经 App 层层传 prop） ---- */
let currentRoute: ConsoleRoute = parseHash();
const listeners = new Set<() => void>();

export function getRouteSnapshot(): ConsoleRoute {
  return currentRoute;
}

export function subscribeRoute(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 相同 key 时 no-op：一次导航绝不产生两次路由更新。 */
export function publishRoute(next: ConsoleRoute): void {
  if (next.key === currentRoute.key) return;
  currentRoute = next;
  listeners.forEach((fn) => fn());
}

/** 在页组件内订阅当前路由（返回的路由对象 key 稳定，可直接比较）。 */
export function useRoute(): ConsoleRoute {
  return useSyncExternalStore(subscribeRoute, getRouteSnapshot);
}
