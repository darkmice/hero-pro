/* R2-5/R2-6 库页收尾批：Kanban 优先级 chip 钉色单测（bun test）。
   只测纯函数 kanbanPriorityChipClass，不渲染组件；渲染后的计算底/字色
   走浏览器探针 K1（探针 + 单测双重锁定，同 R2-3 的 A6 + M6）。
   变异敏感性（已逐项验证，见实施报告 §5）：任一 tone 的字色 token 改
   与底色同 token → 对应测试失败；className 钉色整段去掉 → 探针 K1 失败。 */
import { describe, expect, test } from "bun:test";
import { kanbanPriorityChipClass } from "./ComponentLibraryPage";

describe("kanbanPriorityChipClass（Kanban 优先级 soft chip 钉色）", () => {
  test("高 → danger、 中 → warning、低 → success，各钉控制台 token", () => {
    expect(kanbanPriorityChipClass("高")).toContain("bg-[var(--danger-bg)]");
    expect(kanbanPriorityChipClass("高")).toContain("text-[var(--danger)]");
    expect(kanbanPriorityChipClass("中")).toContain("bg-[var(--warn-bg)]");
    expect(kanbanPriorityChipClass("中")).toContain("text-[var(--warn)]");
    expect(kanbanPriorityChipClass("低")).toContain("bg-[var(--ok-bg)]");
    expect(kanbanPriorityChipClass("低")).toContain("text-[var(--ok)]");
  });
  test("底色 token 与文字 token 不同（同值即对比度 1:1，见 R2-3 M6）", () => {
    for (const p of ["高", "中", "低"] as const) {
      const cls = kanbanPriorityChipClass(p);
      const bg = cls.match(/bg-\[(var\(--[^)]+\))]/)?.[1];
      const fg = cls.match(/text-\[(var\(--[^)]+\))]/)?.[1];
      expect(bg).toBeDefined();
      expect(fg).toBeDefined();
      expect(bg).not.toBe(fg);
    }
  });
});

/* 库页样式修复批（2026-11-26 扫查 8 项）单测：只测纯函数 / 导出常量，
   不渲染组件；渲染后的计算底/字色走浏览器探针（probe-style-fix.cjs）。
   变异敏感性：任一钉色值改回修前值 → 对应测试失败（见实施报告 §5）。 */

// WCAG 相对亮度 + 对比度（与探针同口径）。
function lum(hex: string): number {
  const h = hex.replace("#", "");
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * f(parseInt(h.slice(0, 2), 16)) +
    0.7152 * f(parseInt(h.slice(2, 4), 16)) +
    0.0722 * f(parseInt(h.slice(4, 6), 16))
  );
}
function ratio(fg: string, bg: string): number {
  const l1 = lum(fg), l2 = lum(bg);
  return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
}

import { codeTokenClass, loaderColorValue, LIB_DARK_ACCENT_FIX_CLASS, LIB_DARK_DANGER_FIX_CLASS } from "./ComponentLibraryPage";

describe("LIB_DARK_*_FIX_CLASS（D-1/D-2 深色钉底）", () => {
  test("accent 钉回浅色 #0e7490、白字 5.36；danger 钉回 #b91c1c、白字 6.47", () => {
    expect(LIB_DARK_ACCENT_FIX_CLASS).toBe("dark:bg-[#0e7490]");
    expect(LIB_DARK_DANGER_FIX_CLASS).toBe("dark:bg-[#b91c1c]");
    expect(ratio("#ffffff", "#0e7490")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#ffffff", "#b91c1c")).toBeGreaterThanOrEqual(4.5);
  });
  test("只在深色态生效（dark: 变体），浅色渲染不动", () => {
    expect(LIB_DARK_ACCENT_FIX_CLASS.startsWith("dark:")).toBe(true);
    expect(LIB_DARK_DANGER_FIX_CLASS.startsWith("dark:")).toBe(true);
    expect(LIB_DARK_ACCENT_FIX_CLASS).not.toContain("bg-[#22d3ee]");
    expect(LIB_DARK_DANGER_FIX_CLASS).not.toContain("bg-[#f87171]");
  });
});

describe("codeTokenClass（D-3 代码 token 深色变体）", () => {
  test("浅色值一字不动，深色各有更浅的对应色", () => {
    expect(codeTokenClass("keyword")).toContain("text-[#7c3aed]");
    expect(codeTokenClass("keyword")).toContain("dark:text-[#c4b5fd]");
    expect(codeTokenClass("string")).toContain("text-[#059669]");
    expect(codeTokenClass("string")).toContain("dark:text-[#6ee7b7]");
    expect(codeTokenClass("number")).toContain("text-[#d97706]");
    expect(codeTokenClass("number")).toContain("dark:text-[#fcd34d]");
    expect(codeTokenClass("comment")).toBe("text-[var(--dim)] italic");
  });
  test("深色 token 色对深色代码底 #1e293b 均 ≥4.5（修前紫 2.72）", () => {
    expect(ratio("#c4b5fd", "#1e293b")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#6ee7b7", "#1e293b")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#fcd34d", "#1e293b")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#7c3aed", "#1e293b")).toBeLessThan(4.5);
  });
});

describe("loaderColorValue（D-4 Loader accent 走 token）", () => {
  test("accent 走 var(--accent)，其余四色仍为原写死值", () => {
    expect(loaderColorValue("accent")).toBe("var(--accent)");
    expect(loaderColorValue("current")).toBe("currentColor");
    expect(loaderColorValue("success")).toBe("#059669");
    expect(loaderColorValue("warning")).toBe("#d97706");
    expect(loaderColorValue("danger")).toBe("#dc2626");
  });
  test("token 两端解析值都够亮：浅色 #0e7490 对白底、深色 #22d3ee 对深底", () => {
    expect(ratio("#0e7490", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#22d3ee", "#0b1220")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#0e7490", "#0b1220")).toBeLessThan(4.5);
  });
});

describe("M-1 日程加深色（mock 数据色值）", () => {
  test("加深后的琥珀 #b45309 / 绿 #047857 白字均 ≥4.5（修前 3.19 / 3.77）", () => {
    expect(ratio("#ffffff", "#b45309")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#ffffff", "#047857")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#ffffff", "#d97706")).toBeLessThan(4.5);
    expect(ratio("#ffffff", "#059669")).toBeLessThan(4.5);
  });
});

/* 独立 demo 主题切换单测（2026-11-26）：只测纯函数，不渲染组件。
   真实写路径（点切换 → localStorage heroui-theme + documentElement
   class/data-theme 变化、刷新后保持）由浏览器探针 probe-theme-toggle.cjs
   锁定；这里锁决策逻辑：存储值解析、两态取反、两态文案、存储 key。
   变异敏感性：存储 key 改名 / 取反写错 / 文案两态相同 → 对应测试失败。 */

import { resolveEffectiveTheme, nextStandaloneTheme, standaloneThemeToggleLabel, THEME_STORAGE_KEY } from "./ComponentLibraryPage";

describe("THEME_STORAGE_KEY（与防闪脚本同一份 key）", () => {
  test("就是防闪脚本读的 heroui-theme，改名即与防闪脚本脱钩", () => {
    expect(THEME_STORAGE_KEY).toBe("heroui-theme");
  });
});

describe("resolveEffectiveTheme（存储值 + 系统偏好 → 有效主题）", () => {
  test("显式存储值优先于系统偏好：刷新后保持上次选择", () => {
    expect(resolveEffectiveTheme("dark", false)).toBe("dark");
    expect(resolveEffectiveTheme("light", true)).toBe("light");
  });
  test("system / 未知值跟随系统偏好（与防闪脚本同口径）", () => {
    expect(resolveEffectiveTheme("system", true)).toBe("dark");
    expect(resolveEffectiveTheme("system", false)).toBe("light");
    expect(resolveEffectiveTheme("", true)).toBe("dark");
    expect(resolveEffectiveTheme("bogus", false)).toBe("light");
  });
});

describe("nextStandaloneTheme（两态切换的下一选择）", () => {
  test("永远取反有效主题，且永远是显式值、不再回 system", () => {
    expect(nextStandaloneTheme("dark", false)).toBe("light");
    expect(nextStandaloneTheme("light", true)).toBe("dark");
    expect(nextStandaloneTheme("system", true)).toBe("light");
    expect(nextStandaloneTheme("system", false)).toBe("dark");
    for (const t of ["light", "dark", "system"] as const) {
      for (const p of [true, false]) {
        expect(["light", "dark"]).toContain(nextStandaloneTheme(t, p));
        expect(nextStandaloneTheme(t, p)).not.toBe(resolveEffectiveTheme(t, p));
      }
    }
  });
  test("点两次回到原主题（点一下切、再点切回来）", () => {
    for (const t of ["light", "dark", "system"] as const) {
      for (const p of [true, false]) {
        const once = nextStandaloneTheme(t, p);
        expect(nextStandaloneTheme(once, p)).toBe(resolveEffectiveTheme(t, p));
      }
    }
  });
});

describe("standaloneThemeToggleLabel（两态 aria-label 不同）", () => {
  test("深色态按钮写切到浅色、浅色态写切到深色", () => {
    expect(standaloneThemeToggleLabel("dark")).toBe("切换到浅色主题");
    expect(standaloneThemeToggleLabel("light")).toBe("切换到深色主题");
    expect(standaloneThemeToggleLabel("dark")).not.toBe(standaloneThemeToggleLabel("light"));
  });
});

/* style-polish 批（2026-11-26）单测：只测新增/改动的导出纯函数，不渲染
   组件；渲染后的计算样式走浏览器探针锁定。 */

import { photoAvatarImg, photoAvatarUrl, modelVendorTone, fileTreeIconTone, agendaEventSoft } from "./ComponentLibraryPage";

describe("photoAvatarUrl（C08 照片头像占位）", () => {
  test("同一名字永远同一张，号段 1–70，pravatar 80px", () => {
    expect(photoAvatarUrl("Ada")).toBe(photoAvatarUrl("Ada"));
    expect(photoAvatarImg("Ada")).toBeGreaterThanOrEqual(1);
    expect(photoAvatarImg("Ada")).toBeLessThanOrEqual(70);
    expect(photoAvatarUrl("Ada")).toMatch(/^https:\/\/i\.pravatar\.cc\/80\?img=\d+$/);
  });
  test("5 个 mock 用户取 5 张不同照片（哈希分散）", () => {
    const imgs = new Set(["Ada", "Grace", "Linus", "小白", "老板"].map(photoAvatarImg));
    expect(imgs.size).toBe(5);
  });
});

describe("modelVendorTone（J-M1 厂商色 soft 底）", () => {
  test("Google 青系、Anthropic 紫系、OpenAI 琥珀系，三档不同", () => {
    expect(modelVendorTone("Google")).toContain("var(--accent-bg)");
    expect(modelVendorTone("Anthropic")).toContain("var(--violet-bg)");
    expect(modelVendorTone("OpenAI")).toContain("var(--warn-bg)");
    expect(modelVendorTone("Google")).not.toBe(modelVendorTone("Anthropic"));
    expect(modelVendorTone("Anthropic")).not.toBe(modelVendorTone("OpenAI"));
  });
});

describe("fileTreeIconTone（J-F1 按类型着色）", () => {
  test("文件夹 warn、.tsx/.ts accent、.md 与其他 dim", () => {
    expect(fileTreeIconTone("src", "folder").wrap).toContain("var(--warn-bg)");
    expect(fileTreeIconTone("src", "folder").filled).toBe(true);
    expect(fileTreeIconTone("ui.tsx", "file").wrap).toContain("var(--accent-bg)");
    expect(fileTreeIconTone("route.ts", "file").wrap).toContain("var(--accent-bg)");
    expect(fileTreeIconTone("README.md", "file").wrap).toContain("var(--surface-3)");
    expect(fileTreeIconTone("README.md", "file").filled).toBe(false);
  });
});

describe("agendaEventSoft（C07 事件块 soft 配色）", () => {
  test("6 个 mock 色值各有 soft 对，未知色落 surface-3 + dim", () => {
    expect(agendaEventSoft("#0e7490")).toEqual({ background: "var(--accent-bg)", color: "var(--accent-strong)" });
    expect(agendaEventSoft("#dc2626")).toEqual({ background: "var(--danger-bg)", color: "var(--danger)" });
    expect(agendaEventSoft("#7c3aed")).toEqual({ background: "var(--violet-bg)", color: "var(--violet-strong)" });
    expect(agendaEventSoft("#047857")).toEqual({ background: "var(--ok-bg)", color: "var(--ok)" });
    expect(agendaEventSoft("#b45309")).toEqual({ background: "var(--warn-bg)", color: "var(--warn)" });
    expect(agendaEventSoft("#ff0000")).toEqual({ background: "var(--surface-3)", color: "var(--dim)" });
    expect(agendaEventSoft(undefined)).toEqual({ background: "var(--surface-3)", color: "var(--dim)" });
  });
});
