// 手写图表主题 + tooltip 卡片（R2-3，对照表 §1.3 ChartTooltip 行）。
//
// Pro 的 8 个图表底层全是 Recharts（子组件全是 Recharts 再导出，CSS 层
// 只覆盖 Recharts 内部类名套设计 token），所以这里直接用 Recharts，不引
// 新图表库、不装 @heroui-pro/react、不抄 Pro 源码。
// 主题覆盖照文档思路手写：刻度 10px 弱化文字、默认隐藏轴线与刻度线、
// 网格线弱化（0.15 不透明度）、悬停虚线竖线光标。
// tooltip 不用 Pro 的 ChartTooltip：保留 Recharts Tooltip，把 content
// 换成手写同款卡片（外层圆角边框 + 表面背景 + 浮层阴影，标题行放 X 轴
// 标签，每系列一行：8px 圆点或 12×4 竖条指示符 + 系列名 + 数值；
// labelFormatter / valueFormatter 用手写函数接 Recharts payload）。


/** Recharts Tooltip content 透传的 payload 条目子集（只要卡片渲染用的字段）。 */
export interface ChartTooltipPayloadEntry {
  name?: string;
  value?: number | string | null;
  /** 系列颜色（Recharts 的 color；Area/Line 取 stroke，Bar 取 fill）。 */
  color?: string;
  fill?: string;
  dataKey?: string | number;
}

export type ChartTooltipIndicator = "dot" | "line";

export interface ChartTooltipCardProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string | number;
  /** X 轴标签格式化（默认原样显示）。 */
  labelFormatter?: (label: string | number | undefined) => string;
  /** 系列值格式化（默认原样显示；数值用 String(value)）。 */
  valueFormatter?: (value: number | string | null | undefined, name: string | undefined) => string;
  /** 系列名旁指示符：dot = 8px 圆点（默认），line = 12×4 竖条。 */
  indicator?: ChartTooltipIndicator;
}

/** 纯函数：把 Recharts payload 转成卡片要渲染的行（空 payload → []，卡片不渲染）。 */
export function tooltipRows(
  payload: ChartTooltipPayloadEntry[] | undefined,
  valueFormatter?: ChartTooltipCardProps["valueFormatter"],
): { key: string; name: string; value: string; color: string }[] {
  if (!payload || payload.length === 0) return [];
  return payload.map((p, i) => ({
    key: `${p.dataKey ?? p.name ?? i}`,
    name: p.name ?? "",
    value: valueFormatter ? valueFormatter(p.value, p.name) : p.value === null || p.value === undefined ? "—" : String(p.value),
    color: p.color ?? p.fill ?? "#0e7490",
  }));
}

/** 手写 tooltip 卡片：Recharts <Tooltip content={<ChartTooltipCard />}>。 */
export function ChartTooltipCard({ active, payload, label, labelFormatter, valueFormatter, indicator = "dot" }: ChartTooltipCardProps) {
  const rows = tooltipRows(payload, valueFormatter);
  if (!active || rows.length === 0) return null;
  const title = labelFormatter ? labelFormatter(label) : label === undefined ? undefined : String(label);
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-lg">
      {title !== undefined && <p className="text-xs font-medium text-[var(--dim)]">{title}</p>}
      {rows.map((r) => (
        <p key={r.key} className="flex items-center gap-2 text-xs leading-5">
          {indicator === "line" ? (
            <span className="h-1 w-3 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
          )}
          <span className="flex-1 text-[var(--dim)]">{r.name}</span>
          <span className="font-semibold text-[var(--text)]">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Recharts 主题覆盖（对照表 §1.3 的 CSS 覆盖思路，手写常量复用）：
 *  刻度 10px 弱化文字、默认隐藏轴线与刻度线、网格线弱化到 0.15 不透明度、
 *  悬停虚线竖线光标。用法：
 *    <XAxis dataKey="d" tick={chartTheme.tick} axisLine={false} tickLine={false} />
 *    <CartesianGrid stroke={chartTheme.gridStroke} strokeOpacity={chartTheme.gridOpacity} vertical={false} />
 *    <Tooltip content={<ChartTooltipCard />} cursor={chartTheme.cursor} /> */
export const chartTheme = {
  tick: { fontSize: 10, fill: "var(--dim)" },
  gridStroke: "var(--border)",
  gridOpacity: 0.15,
  cursor: { stroke: "var(--border-strong)", strokeWidth: 1, strokeDasharray: "4 4" },
  /** 各图表默认 margin（Pro 文档 AreaChart 行：top 8 / right 8 / bottom 0 / left 0）。 */
  margin: { top: 8, right: 8, bottom: 0, left: 0 },
} as const;

/** 图例项（Widget 头部用；颜色用 var(--chart-N)，token 未定义时回落到十六进制）。 */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <span className="flex flex-wrap items-center gap-3">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-[var(--dim)]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden="true" />
          {it.label}
        </span>
      ))}
    </span>
  );
}
