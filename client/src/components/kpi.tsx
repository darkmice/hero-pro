// KPI / KPIGroup / TrendChip / NumberValue（R2-3，对照表 §1.2）。
//
// 拼法（对照表原文）：免费 Card 作外壳（dl 语义：标题 dt、数值 dd）；
// 数值用手写 NumberValue（Intl.NumberFormat，decimal / currency /
// percent / compact 按需）；趋势用免费 Chip variant="soft" 拼 TrendChip
// （方向箭头 ↑/↓/– + 数值 + 可选前后缀，颜色按趋势映射 success /
// danger / warning）；迷你图用 Recharts 面积图（KPI.Chart 本质就是
// Recharts 面积图，null 缺失点不断线约定照抄 → connectNulls）；
// KPIGroup 手写布局容器（共享背景 + 圆角，横向等宽，卡片间 1px 分隔线）。
// 文档全文没提数字滚动动画，不要默认 Pro 自带（对照表 §2 第 9 条），
// 所以这里没有 CountUp/滚动动画，数值就是 NumberValue 的格式化输出。

import type { ReactNode } from "react";
import { Chip } from "@heroui/react";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from "recharts";
import { Card, Icon, type IconName } from "./ui";
import { ChartTooltipCard, chartTheme } from "./charts";

/* ---------------- NumberValue ---------------- */

export type NumberValueStyle = "decimal" | "currency" | "percent" | "compact";

export interface NumberValueOptions {
  style?: NumberValueStyle;
  /** style="currency" 时必填（Intl 要求）。 */
  currency?: string;
  /** style="unit" 时必填（本组件不设 unit 样式档，需要时用 formatOptions 传）。 */
  unit?: string;
  notation?: "standard" | "compact" | "scientific" | "engineering";
  signDisplay?: "auto" | "always" | "exceptZero" | "never";
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
  /** 直接传给 Intl.NumberFormat 的其余选项（会覆盖同名分项）。 */
  formatOptions?: Intl.NumberFormatOptions;
}

/** 纯函数：Intl.NumberFormat 格式化；null / undefined / NaN 一律显示 "—"，不编数字。 */
export function formatNumberValue(
  value: number | null | undefined,
  opts: NumberValueOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const { style = "decimal", currency, unit, notation, signDisplay, minimumFractionDigits, maximumFractionDigits, locale = "zh-CN", formatOptions } = opts;
  const intlStyle: Intl.NumberFormatOptions["style"] =
    style === "compact" ? "decimal" : style === "percent" ? "percent" : style === "currency" ? "currency" : "decimal";
  return new Intl.NumberFormat(locale, {
    style: intlStyle,
    ...(intlStyle === "currency" ? { currency: currency ?? "CNY" } : {}),
    ...(unit ? { unit } : {}),
    ...(style === "compact" ? { notation: "compact" } : notation ? { notation } : {}),
    ...(signDisplay ? { signDisplay } : {}),
    ...(minimumFractionDigits !== undefined ? { minimumFractionDigits } : {}),
    ...(maximumFractionDigits !== undefined ? { maximumFractionDigits } : {}),
    ...formatOptions,
  }).format(value);
}

/** 一个 span（inline-flex）+ 可选前后缀 span；currency 时 currency 必填、unit 时 unit 必填。 */
export function NumberValue({
  value,
  prefix,
  suffix,
  className = "",
  ...opts
}: NumberValueOptions & { value: number | null | undefined; prefix?: ReactNode; suffix?: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
      {prefix}
      <span>{formatNumberValue(value, opts)}</span>
      {suffix}
    </span>
  );
}

/* ---------------- TrendChip ---------------- */

export type TrendDirection = "up" | "down" | "neutral";
export type TrendTone = "success" | "danger" | "warning";

/** 纯函数：趋势 → 颜色。文档只确认三色集合为 success/danger/warning，
 *  up/down 具体配色未写明（对照表 TrendChip 行），按本控制台现有设计
 *  token 定：涨 = 好（success）、跌 = 坏（danger）、持平 = warning；
 *  调用处可用 tone 覆盖（如“待处理上升是坏事”时传 danger）。 */
export function trendChipColor(trend: TrendDirection): TrendTone {
  return trend === "up" ? "success" : trend === "down" ? "danger" : "warning";
}

/** 纯函数：趋势 → 方向箭头（内联字符，按 trend 切换）。 */
export function trendChipArrow(trend: TrendDirection): string {
  return trend === "up" ? "↑" : trend === "down" ? "↓" : "–";
}

/** 免费 Chip（variant="soft" 作默认）+ 方向箭头 + 数值文本 + 可选前后缀 span。
 *  注意：soft 变体的底/字色不能直接用 HeroUI 默认 token——构建会丢掉
 *  @supports 包着的 color-mix 淡色定义，--chip-bg 与 --chip-fg 只剩
 *  回退值而同值（文字与底色同色，对比度 1.00:1），与 T3 Badge 修复
 *  （t3-badge-fix）同一根因。所以这里沿用 Badge 的做法：底/字色用
 *  控制台自己的 token 在 className 里钉死（工具类层叠在组件层之上），
 *  Chip 本体仍是免费 HeroUI Chip（尺寸/圆角/排版走它）。 */
export function trendChipToneClass(tone: TrendTone): string {
  return tone === "success"
    ? "bg-[var(--ok-bg)] text-[var(--ok)]"
    : tone === "danger"
      ? "bg-[var(--danger-bg)] text-[var(--danger)]"
      : "bg-[var(--warn-bg)] text-[var(--warn)]";
}

export function TrendChip({
  trend,
  tone,
  value,
  prefix,
  suffix,
  size = "sm",
}: {
  trend: TrendDirection;
  tone?: TrendTone;
  value: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const resolved = tone ?? trendChipColor(trend);
  return (
    <Chip size={size} variant="soft" color={resolved} className={trendChipToneClass(resolved)}>
      <span aria-hidden="true">{trendChipArrow(trend)}</span> {prefix}
      {value}
      {suffix}
    </Chip>
  );
}

/** 纯函数：环比差值 → 趋势方向（null → neutral，调用处另行显示 "—"）。 */
export function deltaTrend(delta: number | null | undefined): TrendDirection {
  if (delta === null || delta === undefined || delta === 0) return "neutral";
  return delta > 0 ? "up" : "down";
}

/** 纯函数：环比差值 → 显示文本（+N / -N / ±0）。 */
export function deltaText(delta: number): string {
  return delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";
}

/* ---------------- 迷你图（KPI.Chart） ---------------- */

export interface SparkPoint {
  /** X 轴标签（日期，如 "2026-11-25"；tooltip 标题行显示它）。 */
  label: string;
  /** 缺失点用 null：Area 用 connectNulls，缺失点不断线（对照表约定照抄）。 */
  value: number | null;
}

export type TrendKey = "decided" | "actioned" | "cases";

/** 纯函数：总览 trend（14 天桶 {date, decided, actioned, cases}）取某一列
 *  做迷你图序列；非有限数一律记 null（不断线，由 connectNulls 接上）。 */
export function buildSparkSeries(
  trend: { date: string; decided?: number; actioned?: number; cases?: number }[],
  key: TrendKey,
): SparkPoint[] {
  return (trend ?? []).map((t) => ({
    label: t.date,
    value: typeof t[key] === "number" && Number.isFinite(t[key]) ? t[key] : null,
  }));
}

/** Recharts 面积迷你图：无轴线无刻度线，悬停用手写 ChartTooltipCard；
 *  空序列时留同高空白（不崩布局、与同行卡片等高）。 */
export function KpiSparkline({
  data,
  name = "数值",
  color = "#0e7490",
  height = 48,
}: {
  data: SparkPoint[];
  name?: string;
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return <div style={{ height }} aria-hidden="true" />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
          <XAxis dataKey="label" hide />
          <RechartsTooltip content={<ChartTooltipCard />} cursor={chartTheme.cursor} />
          <Area
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            fill={color}
            fillOpacity={0.12}
            strokeWidth={1.5}
            connectNulls
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- KPI 卡 ---------------- */

export interface KpiProps {
  title: string;
  icon?: IconName;
  value: number | null | undefined;
  format?: NumberValueOptions;
  /** 环比差值；null/undefined → 显示 "环比 —"（旧数字条同款语义）。 */
  delta?: number | null;
  /** delta 的颜色覆盖（不传时按 delta 符号走 trendChipColor：涨 success / 跌 danger / 平 warning）。 */
  deltaTone?: TrendTone;
  /** 趋势后缀文案，默认 "较昨日"。 */
  deltaSuffix?: string;
  spark?: SparkPoint[];
  sparkName?: string;
  sparkColor?: string;
  /** "card" = 免费 Card 外壳（独立用）；"group" = KPIGroup 内联形态
   *  （无自带边框/阴影/圆角，外壳与分隔线由 KPIGroup 统一给）。 */
  variant?: "card" | "group";
}

function KpiBody({ title, icon, value, format, delta, deltaTone, deltaSuffix = "较昨日", spark, sparkName, sparkColor }: Omit<KpiProps, "variant">) {
  const trend = deltaTrend(delta);
  return (
    <dl className="flex h-full flex-col">
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface-3)]">
            <Icon name={icon} size={14} />
          </span>
        )}
        <dt className="min-w-0 truncate text-xs text-[var(--dim)]">{title}</dt>
      </div>
      <dd className="mt-2 text-2xl font-bold leading-8 tracking-tight">
        <NumberValue value={value} {...(format ?? {})} />
      </dd>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {delta === null || delta === undefined ? (
          <span className="text-xs text-[var(--dim)]">环比 —</span>
        ) : (
          <>
            <TrendChip trend={trend} tone={deltaTone} value={deltaText(delta)} />
            <span className="text-xs text-[var(--dim)]">{deltaSuffix}</span>
          </>
        )}
      </div>
      <div className="mt-auto pt-3">
        <KpiSparkline data={spark ?? []} name={sparkName ?? title} color={sparkColor ?? "#0e7490"} />
      </div>
    </dl>
  );
}

/** 免费 Card 作外壳（dl 语义：标题 dt、数值 dd）；标题行左状态着色图标
 *  容器；数值手写大号排版 + NumberValue；趋势用 Chip 拼 TrendChip；
 *  迷你图用 Recharts 面积图；分隔线场景由 KPIGroup 给。 */
export function Kpi({ variant = "card", ...props }: KpiProps) {
  if (variant === "group") {
    return (
      <div className="min-w-0 bg-[var(--surface)] p-4">
        <KpiBody {...props} />
      </div>
    );
  }
  return (
    <Card className="flex h-full flex-col">
      <div className="flex h-full flex-col p-4">
        <KpiBody {...props} />
      </div>
    </Card>
  );
}

/* ---------------- KPIGroup ---------------- */

/** 手写布局容器：共享背景 + 圆角，横向等宽（移动端 2 列、sm 起 4 列，
 *  与旧数字条的断点一致），卡片之间 1px 分隔线（gap-px + 底色透出）；
 *  纵向堆叠时同理。本质是布局容器，不含图表或数据逻辑。 */
export function KpiGroup({
  children,
  orientation = "horizontal",
  columns = 4,
}: {
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
  columns?: 2 | 3 | 4;
}) {
  if (orientation === "vertical") {
    return <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)]">{children}</div>;
  }
  const cols = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
  return <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] ${cols}`}>{children}</div>;
}
