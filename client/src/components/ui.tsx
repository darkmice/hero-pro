import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type CSSProperties, type ComponentProps, type Key, Children, Fragment, isValidElement } from "react";
import {
  Button as HeroButton,
  Card as HeroCard,
  Checkbox as HeroCheckbox,
  Input as HeroInput,
  ListBox,
  TextArea as HeroTextArea,
  Switch as HeroSwitch,
  Modal as HeroModal,
  useOverlayState,
  ToggleButtonGroup as HeroToggleButtonGroup,
  ToggleButton as HeroToggleButton,
  ProgressBar as HeroProgressBar,
  Select as HeroSelect,
  Skeleton as HeroSkeleton,
  Slider as HeroSlider,
} from "@heroui/react";

/* T3：租户控制台共享组件逐个换 HeroUI 免费版（@heroui/react 3.2.8）。
   导出名与 props 签名一字不变；App.tsx 的 import 与全部调用处不动。
   Token 说明：theme.css 的 :root token（--accent、--surface、--danger、
   --border 等）按层叠顺序覆盖 @heroui/styles 同名默认值，所以 HeroUI
   的 accent / surface / danger 直接就是控制台现有的品牌色；--field-
   background、--default 等无同名映射的 token 走 HeroUI 默认值。
   凡 HeroUI 默认视觉与控制台现有视觉有差的（如字段无边框、按钮 pill
   圆角、开关尺寸），一律在 className 里用工具类钉回原值，并在各导出
   上方注明。 */

/* ---------- Icons (stroke, Lucide-style) ---------- */
const P: Record<string, ReactNode> = {
  shield: <><path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z"/><path d="m9 11.5 2 2 4-4"/></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z"/></>,
  flask: <><path d="M10 2v6L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></>,
  bot: <><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></>,
  cpu: <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1.5 14h5M9.5 8h5M17.5 16h5"/></>,
  ban: <><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></>,
  scroll: <><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
  trash: <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  play: <><polygon points="6 3 20 12 6 21 6 3"/></>,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>,
  check: <><path d="M20 6 9 17l-5-5"/></>,
  x: <><path d="M18 6 6 18M6 6l12 12"/></>,
  alert: <><path d="m21.7 18.4-8-14A2 2 0 0 0 12 3.5a2 2 0 0 0-1.7.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.6Z"/><path d="M12 9v4M12 17h.01"/></>,
  refresh: <><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 21v-5h5"/></>,
  zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
  chart: <><path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/></>,
  key: <><circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 9.5-9.5"/><path d="M15.5 7.5 19 11"/></>,
  globe: <><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20ZM2 12h20"/></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  chevron: <><path d="m9 18 6-6-6-6"/></>,
  archive: <><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></>,
  tag: <><path d="M12.6 2.6 21.4 11.4a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor"/></>,
  trend: <><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></>,
  loop: <><path d="M17 2.5 21 6.5l-4 4"/><path d="M3 12.5v-1a9 9 0 0 1 15.4-6.4L21 7.5"/><path d="M7 21.5 3 17.5l4-4"/><path d="M21 11.5v1a9 9 0 0 1-15.4 6.4L3 16.5"/></>,
  dot: <><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></>,
  /* 壳子（T2）新增，同为手绘 stroke 风格：主题三档 + 侧栏/右侧栏/菜单。 */
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon: <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  panelLeft: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></>,
  panelRight: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
};
export type IconName = keyof typeof P;
export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{P[name]}</svg>
  );
}

/* ---------- Button ---------- */
// HeroUI Button = React Aria Button。实测源码结论（@heroui/react 3.2.8 /
// react-aria-components / react-aria）：
//  - onClick 直通：Button.js 只删 DOM 层 filterDOMProps 过滤出的 onClick
//    （防重复触发），props.onClick 进 useButton → usePress；鼠标点按在
//    原生 click 事件里调一次 onClick（真 MouseEvent，currentTarget /
//    stopPropagation 都是真的），键盘 Enter/Space 在 keyup 走合成 click
//    事件调一次 onClick，触屏点按靠 80ms 兜底 click 调一次。usePress
//    注释原话："Some third-party libraries pass in onClick instead of
//    onPress." 所以不要用 onPress 桥接——那样会触发两次。
//    全站唯一一个用事件参数的 onClick 是 RowMenu 的"更多"触发器
//    （e.stopPropagation() + btnRef 定位），它在鼠标路径拿到的是真事件，
//    且两次调用点都在带 stopPropagation 包裹 span 内，行点击保护不受影响。
//  - disabled 必须手动映射：RAC 只认 isDisabled，原生 disabled 会被
//    filterDOMProps 丢掉（useButton 里 additionalProps.disabled =
//    isDisabled）。isDisabled 置 true 时原生 button 照样 disabled。
//  - type 直通（useButton 默认 'button'，'submit' 原样保留；全站唯一一
//    个 type="submit" 在试判表单里，仍走原生提交）。
//  - 视觉钉回原值：HeroUI 默认 pill 圆角（rounded-3xl）、h-10/md:h-9、
//    text-sm、gap-2；className 钉回 rounded-lg、h-8/9/10、13px、gap-1.5。
//    secondary 的 HeroUI 前景是 accent 柔和色（偏青），钉回中性 --text。
//    dangerOutline → ghost + className 钉回原值：danger-soft 已废弃——它的 --danger-soft /
//    --danger-soft-foreground 在构建产物里只剩回退值（底＝字＝--danger），文字不可见。
//    dark 无 HeroUI 对应变体，用 primary + className 钉回 #0f172a。
//  - 偏差：按钮内 svg 会被 .button 的 svg 规则定到 20px/16px（原 Icon
//    的 size 参数失效）；hover/press 的底色走 HeroUI token 而非旧 class。
type BtnVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerOutline" | "dark";
type BtnSize = "sm" | "md" | "lg";
const btnHeroVariant: Record<BtnVariant, "primary" | "secondary" | "outline" | "ghost" | "danger"> = {
  primary: "primary",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "danger",
  dangerOutline: "ghost",
  dark: "primary",
};
const btnSizeCls: Record<BtnSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs rounded-lg md:h-8",
  md: "h-9 gap-1.5 px-4 text-[13px] rounded-lg md:h-9",
  lg: "h-10 gap-1.5 px-5 text-sm rounded-[10px] md:h-10",
};
// RAC 把 DOM 事件处理函数的事件类型写成 Element，与
// ButtonHTMLAttributes 的 HTMLButtonElement handler 在
// strictFunctionTypes 下逆变不兼容；运行时 currentTarget 实际就是
// button 元素，透传安全——这里只对透传包做一次类型放宽，显式 props
// （variant/size/isDisabled/type/value/className）仍逐个类型检查。
type HeroButtonPassthrough = Omit<ComponentProps<typeof HeroButton>, "variant" | "size" | "isDisabled" | "type" | "value" | "className">;
export function Button({ variant = "primary", size = "md", className = "", disabled, type, value, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <HeroButton
      variant={btnHeroVariant[variant]}
      size={size}
      isDisabled={disabled}
      type={type as "button" | "submit" | "reset" | undefined}
      value={value == null ? undefined : String(value)}
      className={`${btnSizeCls[size]}${variant === "dark" ? " bg-[#0f172a] text-white hover:bg-[#1e293b] active:bg-[#1e293b]" : ""}${variant === "dangerOutline" ? " border border-[var(--danger)]/30 bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white" : ""}${variant === "secondary" ? " text-[var(--text)]" : ""} ${className}`}
      {...(props as unknown as HeroButtonPassthrough)}
    />
  );
}
export function IconButton({ label, className = "", disabled, type, value, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  // 同 Button：onClick 直通、disabled → isDisabled。注意：HeroUI Button
  // 的类型与运行时都不接受 title（RAC filterDOMProps 会丢掉它），所以
  // 原生 tooltip 无法保留，aria-label 保留；32px 用 className 钉住
  // （HeroUI isIconOnly sm 默认 36px 移动 / 32px 桌面）。
  return (
    <HeroButton
      isIconOnly
      size="sm"
      variant="ghost"
      aria-label={label}
      isDisabled={disabled}
      type={type as "button" | "submit" | "reset" | undefined}
      value={value == null ? undefined : String(value)}
      className={`h-8 w-8 rounded-lg text-[var(--dim)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] md:h-8 md:w-8 ${className}`}
      {...(props as unknown as HeroButtonPassthrough)}
    />
  );
}

/* ---------- Badge ---------- */
// T3 回归修复（2026-11-25）：Badge 不再用 HeroUI Chip variant="soft"。
// 根因见 t3-badge-fix/report.md —— 构建产物里 HeroUI 的 --*-soft
// token 只有回退值（--accent-soft: var(--accent) 等），@supports 包着的
// color-mix 淡色定义被丢掉，导致 --chip-bg 与 --chip-fg 同值、文字与
// 底色同色（对比度 1.00:1）。还原为 T3 之前已验证的 span 实现：每 tone
// 的底/字/边框色直接写死为控制台原 token，与改前一字相同。
// R1 决定：仍不用 HeroUI Badge/Chip——soft 变体 token 根因未修
// （构建丢 @supports color-mix，--*-soft 只剩回退值，前景=背景，
// 对比度 1.00:1）；solid/default 变体会改视觉，span 版已验证，
// 留待 token 层修好后再议。
type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning" | "violet" | "dark";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--border)]",
  accent: "bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent)]/20",
  success: "bg-[var(--ok-bg)] text-[var(--ok)] border-[var(--ok)]/20",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20",
  warning: "bg-[var(--warn-bg)] text-[var(--warn)] border-[var(--warn)]/25",
  violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
  dark: "bg-[#0f172a] text-white border-transparent",
};
export function Badge({ tone = "neutral", children, className = "" }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 whitespace-nowrap ${badgeTones[tone]} ${className}`}>{children}</span>;
}

/* ---------- Card ---------- */
// HeroUI Card 复合件。HeroUI Card 默认：p-4、gap-3、24px 圆角、
// surface 背、无边框、shadow-surface；className 全部钉回原值（无内边距、
// gap-0、rounded-xl、border、--surface 底、shadow-card）。CardHeader 用
// Card.Header + Card.Title + Card.Description：Header 的 flex-col 由
// className 的 flex-row 覆盖（工具类层叠在组件层之上），标题 15px 半粗体、
// 描述 12px/--dim、底部分隔线与 px-5 py-4 保留。偏差：Card 现在是
// flex-col 容器（旧的是普通 div），子元素默认 stretch 撑满——与旧布局一致。
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <HeroCard variant="default" className={`gap-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 shadow-card ${className}`}>{children}</HeroCard>;
}
export function CardHeader({ title, desc, action, className = "px-5 py-4" }: { title: string; desc?: string; action?: ReactNode; className?: string }) {
  return (
    <HeroCard.Header className={`flex-row flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] ${className}`}>
      <div><HeroCard.Title className="text-[15px] font-semibold tracking-tight text-[var(--text)]">{title}</HeroCard.Title>{desc && <HeroCard.Description className="mt-0.5 text-xs leading-5 text-[var(--dim)]">{desc}</HeroCard.Description>}</div>
      {action}
    </HeroCard.Header>
  );
}

/* ---------- Form controls ---------- */
// HeroUI Input / TextArea（原生 <input>/<textarea>  primitive，标准 HTML
// 属性全透传；value/onChange/placeholder/disabled/type 均原生语义）。
// 两处与旧实现不同的地方：
//  - HeroUI 默认字段无边框（--field-border-width: 0px、--field-border:
//    transparent，靠底色 + 阴影 + 焦点环），控制台旧字段有 1px
//    border-strong 边框；className 把边框钉回 border-strong、焦点边框
//    钉回 accent，底色/阴影/焦点环走 HeroUI 默认。
//  - 类型收窄：旧 InputHTMLAttributes 的 value/defaultValue 允许 number
//    （调用处确有 value={数字天数}），HeroUI 只接受 string；wrapper 内
//    转 String，签名与调用处不动，渲染值与 onChange 的 e.target.value
//    行为不变。
const fieldBorderCls = "border-[var(--border-strong)] focus:border-[var(--accent)]";
export function Input({ value, defaultValue, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <HeroInput {...props} value={value == null ? undefined : String(value)} defaultValue={defaultValue == null ? undefined : String(defaultValue)} className={`h-9 w-full text-[13px] ${fieldBorderCls} ${props.className ?? ""}`} />;
}
/* Select：HeroUI 免费版（@heroui/react 3.2.8；复合 API：Select + ListBox，
   v3 没有 Select.Option 导出，选项是 ListBox.Item）。
   换法——沿用 ui.tsx 既有惯例（Input 包 HeroInput、Segmented 包
   ToggleButtonGroup）：ui.tsx 只暴露一个简单 Select，调用处仍传原生
   <option> 子元素（.map 动态选项、数值 value、value="" 的“全部”项都原样
   保留），wrapper 内转 ListBox.Item；调用处用 selectedKey /
   onSelectionChange（单选），不再读 e.target.value。
   源码核实（已安装包内 .d.ts / .js，非文档记忆）：
   - 单选 onSelectionChange 参数是单个 Key | null，不是 Set<Key>（react-
     stately useSelectState.js：单选 setValue(key) 后直调
     props.onSelectionChange(key)；Set 只在 selectionMode="multiple" 时
     出现）。useSelectState 还强制 disallowEmptySelection（单选），点选
     不会把选择清成 null；null 只在类型上保留，调用处仍做守卫。
   - selectedKey?: Key | null（@react-types/shared：Key = string |
     number）；空值写法是 null（convertValue：null → []，即无选择，显示
     placeholder；undefined 会走非受控，wrapper 内一律归一成 null）。
   - value="" 的“全部”项是合法 Key："" != null，selectedKeys=[""]，有
     对应 ListBox.Item 时显示该项文案、不显示 placeholder；无对应项时
     才显示 placeholder（RAC Select.js：selectedItems.length===0 时渲染
     placeholder）。本批所有 "" 项都有对应 option，行为与原生一致。
   - 无选择时 placeholder：默认 ""（不传 RAC 默认本地化 "Select an
     item"，那是英文，会改变现有空白外观）；各处 "" option 的文案（"全部
     群组" / "请选择" / "选择成员…"）就是原来的占位文案，继续由 option
     承载。
   - 禁用：整控 isDisabled（SelectRoot 透传 RAC）；单项用 ListBox.Item
     isDisabled（另有根级 disabledKeys 写法，本批不用）。本批 29 处无
     禁用 option，wrapper 按 option 的 disabled 属性转 isDisabled 保留
     能力；整控禁用：Flood/Captcha/Trust 三处默认态（disabled={inherit}）
     走 isDisabled，R1 折进重写（见追加验收 §5）。
   - 数值 value：ListBox.Item id?: Key，number 可直接作 id，不必转
     string；但原生 <select> 的 e.target.value 恒为 string，为复现这
     一语义、避免 string state 对 number id 匹配不上（"12" !== 12 会
     显示空白），wrapper 内把 id 与 selectedKey 一律 String() 归一；
     onSelectionChange 回调只给 string | null，调用处沿用旧的
     Number() / String() / as 转换，含义不变。
   - 样式钉回：HeroUI 默认 --field-border-width: 0px、--field-border:
     transparent（variables.css），触发器默认无可见边框；className 把边
     框钉回 border-strong、焦点边框钉回 accent（与 T3 的 Input 同款钉
     法）——但只钉 border-color 不够：HeroUI 字段规则是
     border-width: var(--border-width-field)，而 --border-width-field
     只在 :root 用 var(--field-border-width, var(--border-width)) 解析
     一次（解析完的 0px 再沿继承链往下传）；触发器上覆写
     --field-border-width 覆写不到已继承下来的 --border-width-field，
     所以边框宽仍是 0、颜色对了也看不见（2026-11-25 四批合一重验 B4
     实测：两态 border-width 均为 0px；S1a 曾在触发器上覆写
     --field-border-width，实测无效，勿重复）。触发器上直接钉
     [--border-width-field:1px]，把字段规则读到的那个变量在本元素上
     覆写为 1px，两态（浅/深）边框都可见；颜色仍走 --border-strong。
     同时透传到根与触发器（w-[160px] / sm:w-[220px] / w-auto
     max-w-[180px] 靠 twMerge 后者胜出）。4330 与分页 select 的 h-8
     无法保留：触发器有 min-h-9 下限，h-8（32px）会被顶回 36px，补丁
     里直接去掉 h-8（见实施报告 §5）。
   - fieldCls 随旧 Select 一并删除：全站只 Select 在用（grep 仅 220–
     221 行两处）；fieldBorderCls（Input/Textarea 共用）保留不动。 */
type SelectProps = {
  "aria-label": string;
  selectedKey: Key | null;
  onSelectionChange: (key: string | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  className?: string;
  children: ReactNode;
};

/* 把 <option> 子节点拼成纯文本（插值、.map 拼接都覆盖），作 textValue。 */
function optionText(node: ReactNode): string {
  let s = "";
  Children.forEach(node, (c) => {
    if (typeof c === "string" || typeof c === "number") s += String(c);
    else if (isValidElement(c)) s += optionText((c.props as { children?: ReactNode }).children);
  });
  return s;
}

/* 把 <option> 子元素扁平化成 ListBox.Item 数据：value（string | number）
   一律 String() 作 id（见上方注释：复现原生恒为 string 的语义）；文案取
   optionText，空文案时回退到 id 本身；disabled 透传。 */
function selectOptions(children: ReactNode): { id: string; label: string; disabled: boolean }[] {
  const out: { id: string; label: string; disabled: boolean }[] = [];
  const walk = (node: ReactNode): void => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) { walk((child.props as { children?: ReactNode }).children); return; }
      const p = child.props as { value?: string | number; disabled?: boolean; children?: ReactNode };
      const id = String(p.value ?? "");
      out.push({ id, label: optionText(p.children) || id, disabled: p.disabled ?? false });
    });
  };
  walk(children);
  return out;
}

export function Select({ "aria-label": ariaLabel, selectedKey, onSelectionChange, placeholder = "", isDisabled, className, children }: SelectProps) {
  const options = selectOptions(children);
  return (
    <HeroSelect aria-label={ariaLabel} selectedKey={selectedKey == null ? null : String(selectedKey)} onSelectionChange={(k) => onSelectionChange(k == null ? null : String(k))} placeholder={placeholder} isDisabled={isDisabled} className={className}>
      <HeroSelect.Trigger className={`w-full text-[13px] ${fieldBorderCls} [--border-width-field:1px] ${className ?? ""}`}>
        <HeroSelect.Value className="text-[13px]" />
        <HeroSelect.Indicator />
      </HeroSelect.Trigger>
      <HeroSelect.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item key={o.id} id={o.id} textValue={o.label} isDisabled={o.disabled}>
              {o.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </HeroSelect.Popover>
    </HeroSelect>
  );
}
export function Textarea({ value, defaultValue, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <HeroTextArea {...props} value={value == null ? undefined : String(value)} defaultValue={defaultValue == null ? undefined : String(defaultValue)} className={`w-full py-2.5 text-[13px] leading-6 ${fieldBorderCls} ${props.className ?? ""}`} />;
}
/* Field：保持原结构（label + hint 包裹层），版式一字不动。HeroUI 的
   Label / Description 需要 id/htmlFor 接线，Field 手头没有 id；现有
   <label> 包裹输入的嵌套关联正是调用处依赖的行为，换 HeroUI 只会
   改语义不改版式，故不换。 */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] leading-4 text-[var(--dim)]">{hint}</span>}</label>;
}

/* ---------- Switch ---------- */
// HeroUI Switch 复合件（SwitchField + Content + Control + Thumb）。onChange 签名
// 与旧的一致：(isSelected: boolean) => void；label 只作 aria-label
// （调用处在开关旁另有可见文字，与旧行为一致）。
// 几何钉回原值：HeroUI md 轨道 40×20、滑块 22×16，lg 轨道 48×24、滑块
// 约 27×20——都不等于旧的 44×24 / 20px 滑块；Control className 钉
// 24×44 圆角满，Thumb 钉 20×20 圆角满，--switch-thumb-offset 重算为
// calc(100% - 20px - var(--spacing))，使选中时滑块左缘落在 22px
// （左右各留 2px，与旧 translateX(2px→22px) 一致）。
// 颜色钉回原值：HeroUI 开态底色默认 --accent（品牌青），PM 已定开态绿
// 不动；根 style 覆盖 --switch-control-bg-checked / -hover 为
// var(--switch-green)（浅 #34c759 / 深 #30d158，随主题切换），关态底色
// 覆盖为 var(--border-strong)。浅/深两态都要验。
export function Switch({ checked, onChange, label, isDisabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; isDisabled?: boolean }) {
  return (
    <HeroSwitch
      isSelected={checked}
      isDisabled={isDisabled}
      onChange={onChange}
      aria-label={label}
      className="shrink-0 self-center"
      style={{ "--switch-control-bg": "var(--border-strong)", "--switch-control-bg-checked": "var(--switch-green)", "--switch-control-bg-checked-hover": "var(--switch-green)" } as CSSProperties}
    >
      <HeroSwitch.Content>
        <HeroSwitch.Control className="h-6 w-11 rounded-full">
          <HeroSwitch.Thumb className="h-5 w-5 rounded-full" style={{ "--switch-thumb-offset": "calc(100% - 20px - var(--spacing))" } as CSSProperties} />
        </HeroSwitch.Control>
      </HeroSwitch.Content>
    </HeroSwitch>
  );
}

/* ---------- Checkbox ---------- */
// HeroUI Checkbox 复合件（@heroui/react 3.2.8，源码核实，见实施报告
// §1）：Checkbox = Root（RAC CheckboxField），只渲染外层 div + 隐藏
// input 的挂载点；可见的方框必须由子件拼出来——
// <Checkbox.Content>（RAC CheckboxButton，渲染 <label> + 视觉隐藏的
// 原生 input）> <Checkbox.Control>（16px 方框，默认 size-4，与旧
// h-4 w-4 同尺寸）> <Checkbox.Indicator>（默认勾 / 半选横线 svg）。
// 裸写 <Checkbox isSelected … /> 没有子件时只剩一个空 div，看不见框，
// 千万别这么写。props 走 RAC：isSelected / isIndeterminate /
// isDisabled / onChange(isSelected: boolean)；RAC 只认 isDisabled，
// 原生 disabled 会被 filterDOMProps 丢掉（T3 报告 §2.2 的教训）。
// 半选态：isIndeterminate 只在未全选时传 true（some && !all），与
// 旧的 ref 回调 el.indeterminate = some && !all 同语义。
// label 只作无可见文字时的 aria-label；有 children（可见文字）时不传
// aria-label，Content 的 <label> 文本就是无障碍名。contentClassName /
// controlClassName 供向导行、日志筛选行把整行样式搬到 Content 上
// （Content 本身就是 label，单 label、无嵌套；.checkbox__content 在
// @layer components，Tailwind 工具类在 @layer utilities，后者赢）。
export function Checkbox({ isSelected, isIndeterminate = false, isDisabled = false, onChange, label, className = "", contentClassName, controlClassName, children }: {
  isSelected: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
  contentClassName?: string;
  controlClassName?: string;
  children?: ReactNode;
}) {
  return (
    <HeroCheckbox isSelected={isSelected} isIndeterminate={isIndeterminate} isDisabled={isDisabled} onChange={onChange} aria-label={children ? undefined : label} className={`shrink-0 ${className}`}>
      <HeroCheckbox.Content className={contentClassName}>
        <HeroCheckbox.Control className={controlClassName}><HeroCheckbox.Indicator /></HeroCheckbox.Control>
        {children}
      </HeroCheckbox.Content>
    </HeroCheckbox>
  );
}

/* ---------- Slider ---------- */
// HeroUI Slider 复合件（@heroui/react 3.2.8，源码核实，见实施报告
// §1）：Slider = Root（RAC Slider），必需结构是
// <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>；
// Thumb 必须在 Track 内（RAC 要求），Output 可选（本站都不需要数值
// 输出——各点位旁边已有数字框 / 文字显示值，不另加）。props 走 RAC：
// value: number | number[]、onChange(value)、minValue / maxValue /
// step / isDisabled / aria-label——注意不是原生 min / max / value。
// 本 wrapper 只接单值 number：onChange 里把 number[] 折成首个值。
// 根默认 gap-1（label / output 空行会多出 4px 高）用 gap-0 钉掉；
// 原生的 h-2（轨道高）不带过来，轨道高走 HeroUI 自身 CSS。
export function Slider({ value, onChange, minValue = 0, maxValue = 100, step = 1, label, isDisabled = false, className = "" }: {
  value: number;
  onChange: (v: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  label: string;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <HeroSlider aria-label={label} minValue={minValue} maxValue={maxValue} step={step} value={value} onChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? 0) : v)} isDisabled={isDisabled} className={`gap-0 ${className}`}>
      <HeroSlider.Track><HeroSlider.Fill /><HeroSlider.Thumb /></HeroSlider.Track>
    </HeroSlider>
  );
}

/* ---------- Segmented control ---------- */
// HeroUI ToggleButtonGroup（isDetached，分离式）+ ToggleButton（Segment
// 是 Pro）。selectionMode="single" + selectedKeys={[value]} +
// onSelectionChange 取首个 key；disallowEmptySelection 防点已选项变空。
// 选中态钉回原值：旧的是 --surface 底 + 阴影 + 1px 边框环，用
// data-[selected=true]: 工具类覆盖（HeroUI 默认选中是 accent 柔和底）。
// count 角标用 ToggleButton 的 render-prop children 取 isSelected，
// 选中态 accent 底/accent 字、未选中 surface-3/dim，与旧一致。
// 按钮钉 h-7（补 md:h-7 防 HeroUI sm 档的 md:h-8 在桌面覆盖）、
// rounded-md、px-3、text-xs；容器保留旧的边框、surface-2 底、p-1、
// 10px 圆角、gap-0.5。aria-pressed 语义由 RAC ToggleButton 原生提供。
export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number; disabled?: boolean }[]; ariaLabel: string }) {
  return (
    <HeroToggleButtonGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => { const v = [...keys][0] as T | undefined; if (v !== undefined) onChange(v); }}
      aria-label={ariaLabel}
      size="sm"
      isDetached
      className="max-w-full flex-wrap gap-0.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-1"
    >
      {options.map((o) => (
        <HeroToggleButton key={o.value} id={o.value} isDisabled={o.disabled} className="h-7 gap-1.5 rounded-md bg-transparent px-3 text-xs font-medium text-[var(--dim)] hover:text-[var(--text)] data-[disabled=true]:opacity-40 data-[selected=true]:bg-[var(--surface)] data-[selected=true]:text-[var(--text)] data-[selected=true]:shadow-sm data-[selected=true]:ring-1 data-[selected=true]:ring-[var(--border)] md:h-7">
          {({ isSelected }) => (<>{o.label}{o.count !== undefined && <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${isSelected ? "bg-[var(--accent-bg)] text-[var(--accent)]" : "bg-[var(--surface-3)] text-[var(--dim)]"}`}>{o.count}</span>}</>)}
        </HeroToggleButton>
      ))}
    </HeroToggleButtonGroup>
  );
}

/* ---------- Progress ---------- */
// HeroUI ProgressBar。旧 value 是 0..1 的分数，HeroUI value 是 0..100，
// 换算成 pct 传入；tone 与 HeroUI color 一一对应（accent/danger/
// warning/success）。role=progressbar 与 aria-valuenow/min/max 由 RAC
// 原生提供；补 aria-label="进度"（RAC 无 label 时无障碍名缺失）。
// 轨道钉回 h-2 圆角满 + surface-3 底、填充钉回圆角满；根的 grid 默认
// gap-1（label/output 空行会多出 4px 高）用 gap-0 钉掉。
export function Progress({ value, tone = "accent", className = "" }: { value: number; tone?: "accent" | "danger" | "warning" | "success"; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <HeroProgressBar value={pct} color={tone} aria-label="进度" className={`gap-0 ${className}`}>
      <HeroProgressBar.Track className="rounded-full bg-[var(--surface-3)]">
        <HeroProgressBar.Fill className="rounded-full" />
      </HeroProgressBar.Track>
    </HeroProgressBar>
  );
}

/* ---------- Table ---------- */
// 决定：保持原生 <table>/<th>/<td> 结构，只把样式迁到 HeroUI 主题 token
// （即沿用现有 token 类，不另写样式）。原因：调用处传原生 thead/tbody/
// tr/th/td 子元素，HeroUI Table 的复合 API（Table.Header/Column/Body/
// Row/Cell）不兼容，不动 App.tsx 就换不了；方案 §3 也写明不用 HeroUI
// Table。保留：min-w-[640px]、theme.css 里
// .data-table-wrap[data-sticky-action] 的粘性操作列行为（那套 CSS 不
// 动）、字号与内边距。TanStack Table 数据层迁移不是 T3（那是动 App.tsx
// 的 T4 工作），不做。
// Every data table fills its container (w-full on wrapper AND table,
// backed by the .data-table rules in theme.css). When the columns are
// wider than the container, scrolling happens inside the wrapper —
// never the page — and the last column (the 操作 action column in
// every table that uses this) stays pinned to the right edge with an
// opaque background + shadow so rows never slide underneath it.
// Tables whose last column is content (e.g. logs' 详情) pass
// stickyAction={false}.
export function TableWrap({ children, stickyAction = true }: { children: ReactNode; stickyAction?: boolean }) {
  return (
    <div className="data-table-wrap w-full max-w-full overflow-x-auto" data-sticky-action={stickyAction ? "true" : undefined}>
      <table className="data-table w-full min-w-[640px] border-collapse text-left text-[13px]">{children}</table>
    </div>
  );
}
export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--dim)] ${className}`}>{children}</th>;
}
export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-[var(--border)] px-4 py-3.5 align-middle text-[var(--text-2)] ${className}`}>{children}</td>;
}

/* ---------- DetailPanel ---------- */
// 决定：无 HeroUI 对应物，保持手写，只做 token 层面的样式对齐（现有类
// 已全部走 var(--*) token，无需改动）。
// The ONE shared expandable detail panel for the whole app: a row or
// card keeps only a truncated summary; clicking the row / 查看详情
// expands this panel directly below it with the full content split
// into headed sections, and 收起 (or clicking the row again) collapses
// it. Each call site owns exactly one expandedId state, so only one
// panel is open at a time per list. In tables the panel is rendered
// inside a <tr><td colSpan className="detail-cell"> row; in card
// lists it renders directly under the card.
export function DetailPanel({ title, onClose, sections, className = "" }: { title: string; onClose: () => void; sections: { heading: string; children: ReactNode }[]; className?: string }) {
  return (
    <div className={`w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3.5 text-left ${className}`}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-semibold text-[var(--text)]">{title}</p>
        <button type="button" onClick={onClose} aria-label="收起详情" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--dim)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text)]">收起<Icon name="chevron" size={13} className="-rotate-90" /></button>
      </div>
      <div className="space-y-3.5">
        {sections.map((s) => (
          <div key={s.heading} className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--dim)]">{s.heading}</p>
            <div className="min-w-0 text-[13px] leading-6 text-[var(--text-2)]">{s.children}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Empty / Loading ---------- */
// EmptyState：保持手写，版式一字不动。原因：EmptyState 组件本身是 Pro，
// 任务书说"用 Card + 文案拼"；但实测 23 处调用全部已经处于 Card 内
// （或为整页返回），再包一层 HeroUI Card 会造成双层卡片。图标圆 /
// 图片 / 标题 / 描述 / 操作按钮的版式与旧一致。
export function EmptyState({ icon = "inbox", title, desc, action, image, size = "md" }: { icon?: IconName; title: string; desc?: string; action?: ReactNode; image?: string; size?: "sm" | "md" | "lg" }) {
  /* R2-1：三档尺寸（对照表 EmptyState 行：sm 紧凑 / md 默认 / lg 宽松）；
     md 与旧版式一字不动；标题 <p> -> <h3>（Pro 结构 Title 渲染为 h3），视觉不变。 */
  const pad = size === "sm" ? "px-4 py-6" : size === "lg" ? "px-6 py-16" : "px-6 py-12";
  const iconBox = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const iconSize = size === "sm" ? 18 : size === "lg" ? 28 : 22;
  return (
    <div className={`flex flex-col items-center ${pad} text-center`}>
      {image
        ? <img src={image} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-md ring-1 ring-[var(--border)]" />
        : <div className={`flex ${iconBox} items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--dim)]`}><Icon name={icon} size={iconSize} /></div>}
      <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--dim)]">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
// Skeleton：HeroUI Skeleton，animationType="pulse"（旧的 animate-pulse），
// 圆角与底色钉回 rounded-lg + surface-3。
export function Skeleton({ className = "" }: { className?: string }) { return <HeroSkeleton animationType="pulse" className={`rounded-lg bg-[var(--surface-3)] ${className}`} />; }

/* ---------- Modal ---------- */
// HeroUI Modal 复合件 + useOverlayState。useOverlayState 支持受控模式
// （isOpen + onOpenChange 直通）：state 传给 ModalRoot，Backdrop/Container
// 从 DialogTrigger 上下文取 open 态；点遮罩（isDismissable 默认 true）、
// Esc（默认开启）、右上关闭 X 都走 onOpenChange(false) → onClose()。
// 不再像旧实现那样 open=false 时直接 return null，改由 HeroUI 管进出场
// 动画与卸载。
// 版式钉回原值：Dialog 默认 p-6、24px 圆角，钉回 p-0 与移动端上圆角
// 16px（rounded-t-2xl）/ 桌面 16px（sm:rounded-2xl）；默认宽用
// Container size="lg"（max-w-lg），wide=720px 用 Dialog className
// max-w-[720px] 覆盖；placement="auto" 默认即移动端底部弹出、桌面居中，
// 与旧的 items-end / sm:items-center 一致；scroll="inside" 使 body 区
// 域内滚动。Header 钉回 px-5 py-4 + 底部分隔线 + 标题 15px 半粗体，
// 右侧为绝对定位的关闭 X（end-4 top-4，32px），Header 补 pr-12 防长标
// 题顶到 X。Body 钉回 px-5 py-4 + 纵向滚动；Footer 钉回 px-5 py-3.5 +
// 顶部分隔线 + surface-2 底 + 右对齐。遮罩补 backdrop-blur-[2px]。
// 偏差：Dialog 最大高仍钉 92dvh（与旧一致）；Body 保留 HeroUI -3px
// 的 focus 外溢边距。
export function Modal({ open, onClose, title, desc, children, footer, wide = false }: { open: boolean; onClose: () => void; title: string; desc?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const state = useOverlayState({ isOpen: open, onOpenChange: (v) => { if (!v) onClose(); } });
  return (
    <HeroModal state={state}>
      <HeroModal.Backdrop className="backdrop-blur-[2px]">
        <HeroModal.Container placement="auto" scroll="inside" size="lg">
          <HeroModal.Dialog className={`max-h-[92dvh] rounded-t-2xl p-0 sm:rounded-2xl ${wide ? "max-w-[720px]" : ""}`}>
            <HeroModal.CloseTrigger aria-label="关闭" className="h-8 w-8"><Icon name="x" size={18} /></HeroModal.CloseTrigger>
            <HeroModal.Header className="flex-row flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 pr-12">
              <div><HeroModal.Heading className="text-[15px] font-semibold text-[var(--text)]">{title}</HeroModal.Heading>{desc && <p className="mt-0.5 text-xs leading-5 text-[var(--dim)]">{desc}</p>}</div>
            </HeroModal.Header>
            <HeroModal.Body className="overflow-y-auto px-5 py-4 text-[var(--text)]">{children}</HeroModal.Body>
            {footer && <HeroModal.Footer className="mt-0 border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-3.5">{footer}</HeroModal.Footer>}
          </HeroModal.Dialog>
        </HeroModal.Container>
      </HeroModal.Backdrop>
    </HeroModal>
  );
}

/* ---------- Avatar ---------- */
// 决定：保持手写。首字母 + 哈希取色（AV_COLORS）是调用处依赖的契约：
// 尺寸任意（实测调用处用 28/30/32/34/36/56 六档），HeroUI Avatar 只有
// sm/md/lg 三档固定尺寸且默认圆角 24px（非全圆），无法无损承载同一
// 哈希底色 + 首字母 + 任意尺寸，故不换。
const AV_COLORS = ["#0e7490", "#7c3aed", "#059669", "#d97706", "#dc2626", "#2563eb"];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const ch = (name.replace(/^@/, "").trim()[0] ?? "?").toUpperCase();
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  const bg = AV_COLORS[h % AV_COLORS.length];
  return <span className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }} aria-hidden="true">{ch}</span>;
}
