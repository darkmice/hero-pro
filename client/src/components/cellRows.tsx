/* R2-2 共享设置行组件（Cell* 四件，2026-11-26）。
 *
 * 契约（对照表 §1.4，库页 Cell* 条目同款）：标签左、值右、整行可点
 * （点文字区也触发，点控件本身不重复触发）。一份实现，供六页
 * （bench / logs / policies / rules / blacklist / models）与库页共用。
 *
 * 拼法：免费 HeroUI 同名组件（ui.tsx 的 Select / Switch / Slider 包装，
 * 颜色用 @heroui/react 的 ColorPicker + ColorSwatch + Popover）。
 * 不装 @heroui-pro/react，不抄 Pro 代码；不用 HeroUI Table。
 *
 * CellColorPicker 的颜色初始化必须走 HSL（带 hue 通道）：
 * parseColor(hex) 得 RGBColor，没有 hue 通道，ColorSlider
 * channel="hue" 挂载即抛错、整站白屏（R2-5/R2-6 的 D1 事故）。
 * 所以本文件不 export parseColor(hex) 的用法：对外只收 hex 字符串，
 * 内部经 hexToHslString 转 HSL 再 parseColor；6 个预设色用预先算好
 * 的精确等价 HSL（保留 2 位小数，取整会使个别色偏 1）。ColorSlider /
 * ColorArea 必须带 Track / Thumb 子件（自闭合时轨道是 0 高空 div，
 * 看得见却拖不动，见 D1b）。
 */
import { useMemo, useRef, type ReactNode } from "react";
import { ColorArea, ColorPicker, ColorSlider, ColorSwatch, parseColor } from "@heroui/react";
import { Select, Slider, Switch } from "./ui";

/* 默认行样式：库页 Cell* 条目同款（边框圆角行，标签左、值右）。 */
export const CELL_ROW_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] px-4 py-3 text-left";

/* 6 个预设色：hex 只作色块底色与对外值；hsl 是各 hex 的精确等价写法
 * （保留 2 位小数；取整会使 5/6 个色偏 1，如 #7c3aed 会变成 #7c3bed）。 */
export const CELL_COLOR_PRESETS: { hex: string; hsl: string }[] = [
  { hex: "#0e7490", hsl: "hsl(192.92, 82.28%, 30.98%)" },
  { hex: "#7c3aed", hsl: "hsl(262.12, 83.26%, 57.84%)" },
  { hex: "#059669", hsl: "hsl(161.38, 93.55%, 30.39%)" },
  { hex: "#d97706", hsl: "hsl(32.13, 94.62%, 43.73%)" },
  { hex: "#dc2626", hsl: "hsl(0, 72.22%, 50.59%)" },
  { hex: "#2563eb", hsl: "hsl(221.21, 83.19%, 53.33%)" },
];

/* hex → HSL 字符串（标准换算，2 位小数）。任意 hex 经此路再 parseColor
 * 得到的都是带 hue 通道的 HSLColor，ColorSlider channel="hue" 不抛错。
 * 3 位缩写（#fff）先展开；非法输入由调用方 parseCellColor 兜底。 */
export function hexToHslString(hex: string): string {
  const raw = hex.trim().replace(/^#/, "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `hsl(0, 0%, ${String(parseFloat((l * 100).toFixed(2)))}%)`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  /* 2 位小数，去尾零：h=0 时写 "0" 不写 "0.00"，与预设表口径一致。 */
  const fmt = (n: number) => String(parseFloat(n.toFixed(2)));
  return `hsl(${fmt(h)}, ${fmt(s * 100)}%, ${fmt(l * 100)}%)`;
}

/* hex → 带 hue 通道的 Color：预设色走表里精确 HSL（逐字回原 hex），
 * 其余走现算 HSL；解析失败回退默认青（不抛错、不白屏）。 */
function parseCellColor(hex: string) {
  const norm = hex.trim().replace(/^#/, "").toLowerCase();
  const full = norm.length === 3 ? norm.split("").map((c) => c + c).join("") : norm;
  const preset = CELL_COLOR_PRESETS.find((p) => p.hex.replace(/^#/, "").toLowerCase() === full);
  try {
    return parseColor(preset ? preset.hsl : hexToHslString(`#${full}`));
  } catch {
    return parseColor("hsl(192.92, 82.28%, 30.98%)");
  }
}

function a11y(label: ReactNode, ariaLabel?: string): string {
  if (ariaLabel !== undefined) return ariaLabel;
  return typeof label === "string" ? label : "设置项";
}

function CellLabel({ label, description }: { label: ReactNode; description?: ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium">{label}</div>
      {description !== undefined && <div className="mt-0.5 text-xs leading-5 text-[var(--dim)]">{description}</div>}
    </div>
  );
}

export type CellOption = { value: string; label: string; disabled?: boolean };

/* CellSelect：行内下拉行。点文字区 dispatch 一次 click 到 Select 触发器
 * （库页同款做法）；点触发器本身不重复触发（closest("button") 拦截）；
 * 禁用时整行不触发。 */
export function CellSelect({ label, description, value, onChange, options, isDisabled, controlClassName, className, ariaLabel }: {
  label: ReactNode;
  description?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: CellOption[];
  isDisabled?: boolean;
  controlClassName?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={className ?? CELL_ROW_CLASS}
      onClick={(e) => {
        if (isDisabled) return;
        if ((e.target as HTMLElement).closest("button")) return;
        const btn = e.currentTarget.querySelector("button");
        btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }}
    >
      <CellLabel label={label} description={description} />
      <Select
        aria-label={a11y(label, ariaLabel)}
        selectedKey={value}
        onSelectionChange={(k) => { if (k) onChange(String(k)); }}
        isDisabled={isDisabled}
        className={controlClassName ?? "w-32"}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </Select>
    </div>
  );
}

/* CellSwitch：开关行。整行包成可点区：点文字区直接翻转；点开关本身
 * 由 Switch 自己处理（closest("label,button,input") 拦截，不重复翻转）；
 * trailing 放开关后的附加操作（如编辑 / 删除按钮），点它们也不翻转。 */
export function CellSwitch({ label, description, checked, onChange, isDisabled, trailing, className, ariaLabel }: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  isDisabled?: boolean;
  trailing?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={className ?? CELL_ROW_CLASS}
      onClick={(e) => {
        if (isDisabled) return;
        if ((e.target as HTMLElement).closest("label,button,input")) return;
        onChange(!checked);
      }}
    >
      <CellLabel label={label} description={description} />
      <span className="flex shrink-0 items-center gap-3">
        <Switch label={a11y(label, ariaLabel)} checked={checked} onChange={onChange} isDisabled={isDisabled} />
        {trailing}
      </span>
    </div>
  );
}

/* 点标签聚焦滑杆：HeroUI 3.2.8 的 Slider 拇指是无 role、无 tabindex 的
 * 普通 div（data-slot="slider-thumb"），全文档 [role="slider"] 为 0，
 * 旧版 focusSlider 查 [role="slider"] 恒为 no-op（R2-2 D1）。拇指内含
 * 原生 <input type="range" tabindex="0">，Tab 能落到它、方向键调值，
 * 所以聚焦目标改查行内的 range input；[role="slider"] 只作后备
 * （换别的滑杆实现时仍能聚焦）。返回是否成功聚焦，供测试断言。 */
export function focusCellSlider(row: HTMLElement | null): boolean {
  if (!row) return false;
  const target = row.querySelector<HTMLElement>('input[type="range"]')
    ?? row.querySelector<HTMLElement>('[role="slider"]');
  if (!target) return false;
  target.focus();
  return true;
}

/* CellSlider：滑杆行。标签左、滑杆 + 数值右；点标签区聚焦滑杆的
 * range input（键盘方向键即调，点滑杆本身照常拖动）；output 默认纯数值，可传
 * 自定义节点（如数字输入框）。 */
export function CellSlider({ label, description, value, onChange, minValue = 0, maxValue = 100, step = 1, formatValue, output, isDisabled, className, ariaLabel }: {
  label: ReactNode;
  description?: ReactNode;
  value: number;
  onChange: (v: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  formatValue?: (v: number) => string;
  output?: ReactNode;
  isDisabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const focusSlider = () => { focusCellSlider(rowRef.current); };
  return (
    <div ref={rowRef} className={className ?? CELL_ROW_CLASS}>
      <div className="shrink-0 cursor-pointer" onClick={focusSlider}>
        <div className="text-sm font-medium">{label}</div>
        {description !== undefined && <div className="mt-0.5 text-xs leading-5 text-[var(--dim)]">{description}</div>}
      </div>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <Slider
          label={a11y(label, ariaLabel)}
          value={value}
          onChange={onChange}
          minValue={minValue}
          maxValue={maxValue}
          step={step}
          isDisabled={isDisabled}
          className="min-w-0 flex-1"
        />
        {output ?? <output className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{formatValue ? formatValue(value) : String(value)}</output>}
      </span>
    </div>
  );
}

/* CellColorPicker：颜色行。对外只收 / 只出 hex 字符串（大写，如 #0E7490），
 * 内部一律 HSL 解析（见文件头 D1 说明）；触发器显示色块 + 当前 hex；
 * 面板含 ColorArea（+ Thumb）与 hue ColorSlider（Track + Thumb）及
 * 6 个预设色（点选即精确回原 hex）。触发器不加 aria-label：无障碍名
 * 就是内容里的 hex 文本（颜色面板探针按 hex 名定位触发器）。 */
export function CellColorPicker({ label, description, value, onChange, presets, className }: {
  label: ReactNode;
  description?: ReactNode;
  value: string;
  onChange: (hex: string) => void;
  presets?: { hex: string; hsl: string }[];
  className?: string;
}) {
  const color = useMemo(() => parseCellColor(value), [value]);
  const list = presets ?? CELL_COLOR_PRESETS;
  const displayHex = value.startsWith("#") ? value.toUpperCase() : `#${value}`.toUpperCase();
  const emit = (c: ReturnType<typeof parseColor>) => onChange(c.toString("hex").toUpperCase());
  return (
    <div className={className ?? CELL_ROW_CLASS}>
      <CellLabel label={label} description={description} />
      <ColorPicker value={color} onChange={emit}>
        <ColorPicker.Trigger className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium">
          <ColorSwatch color={color} className="h-5 w-5 rounded-md" />
          {displayHex}
        </ColorPicker.Trigger>
        <ColorPicker.Popover placement="bottom end" className="w-64 p-3">
          <ColorArea value={color} onChange={emit} className="h-32 w-full rounded-lg">
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider channel="hue" value={color} onChange={emit} className="mt-3" aria-label="色相">
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
          <div className="mt-3 flex gap-1.5">
            {list.map(({ hex }) => (
              <button key={hex} type="button" aria-label={`预设色 ${hex}`} className="h-6 w-6 rounded-md ring-1 ring-[var(--border)]" style={{ background: hex }} onClick={() => onChange(hex.toUpperCase())} />
            ))}
          </div>
        </ColorPicker.Popover>
      </ColorPicker>
    </div>
  );
}
