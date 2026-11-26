/* 组件库页（R2-5 / R2-6 合并批）。
 *
 * 定位：控制台里的组件库页，挂在设置分组下（路由 #/library）。
 * 老板 2026-11-26 01:00 定：不要以 demo 方式开发——这里的每个条目
 * 都是真实可用的组件，与产品页共用同一份组件代码（./components/ui
 * 的共享导出 + @heroui/react 3.2.8 免费版 + Recharts）；演示用的
 * mock 只是数据（假群名、假消息、假事件），不是另写一套假组件。
 * 不调任何后端接口（无 api import），不碰 app.db。
 * 不用 HeroUI Table（R2-1 的事）；列表/展示用 ListBox / Card /
 * Disclosure。Pro 只当参考：不装 @heroui-pro/react，不抄付费代码。
 * Map / 富文本 / 轮播三件的免依赖实现见各条目内注释（maplibre-gl /
 * @tiptap/* / embla-carousel 列在实施报告的待批依赖清单里，批后按
 * 报告里的替换点换装；当前实现与之同行为契约，不另起一套演示）。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Button as HeroButton,
  Checkbox as HeroCheckbox,
  CheckboxGroup as HeroCheckboxGroup,
  Chip as HeroChip,
  Disclosure,
  Dropdown,
  Label,
  ListBox,
  Menu,
  Modal as HeroModal,
  NumberField,
  Popover,
  Radio,
  RadioGroup,
  SearchField,
  Select as HeroSelect,
  Separator,
  Sheet as HeroSheet,
  Skeleton as HeroSkeleton,
  ToggleButton,
  Tooltip,
  toast,
  useOverlayState,
} from "@heroui/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  Field,
  Icon,
  Input,
  Modal,
  Progress,
  Segmented,
  TableWrap,
  Select,
  Skeleton,
  Slider,
  Switch,
  Textarea,
} from "../components/ui";
import { CellColorPicker, CellSelect, CellSlider, CellSwitch } from "../components/cellRows";
import { TableHead, makeSortingChangeHandler, sortingFromSort, useAppTable, type AppColumnDef, type ColumnVisibilityState, type SimpleSort } from "../components/dataTable";
import { flexRender } from "@tanstack/react-table";
import { TrendChip, trendChipToneClass } from "../components/kpi";
import { useShellTheme } from "../themeController";
import type { RouteTab } from "../route";

export type NavigateFn = (nextTab: RouteTab) => void;

/* ---------- mock 数据（只是数据，不是假组件） ---------- */

const MOCK_GROUPS = ["DeePlanGroup", "CryptoPush_Example", "ForwardHubBOT", "@NextCLi 讨论组"];
const MOCK_USERS = ["Ada", "Grace", "Linus", "小白", "老板"];
const MOCK_MSGS = [
  { id: 1, user: "Ada", text: "这个群的广告有点多，能不能加个关键词？", time: "09:41", tone: "neutral" as const },
  { id: 2, user: "Grace", text: "刚有人发了钓鱼链接，已经删了。", time: "09:43", tone: "danger" as const },
  { id: 3, user: "Linus", text: "新人验证通过 12 人，超时踢出 1 人。", time: "09:50", tone: "success" as const },
];

const fmtInt = (n: number) => new Intl.NumberFormat("zh-CN").format(n);
const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ---------- 照片头像（style-polish C08） ----------
 * mock 用户头像改照片占位：pravatar 免费占位图（70 张真人照，按名哈希
 * 取号，同一名字永远同一张）；加载失败时回退到字母头像（ui.tsx 的
 * Avatar），图床被沙箱代理拦时探针以回退态验收。导航处（shell.tsx 的
 * UserMenu）不在本文件，保留字母头像。不内联 base64、不新增依赖。 */
export function photoAvatarImg(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (h % 70) + 1;
}
export function photoAvatarUrl(name: string): string {
  return `https://i.pravatar.cc/80?img=${photoAvatarImg(name)}`;
}
function PhotoAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Avatar name={name} size={size} />;
  return (
    <img src={photoAvatarUrl(name)} alt="" aria-hidden="true" width={size} height={size}
      className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }}
      onError={() => setFailed(true)} />
  );
}

/* ---------- 本页自用的小 glyph（ui.tsx Icon 里没有的几个） ---------- */

function StarSvg({ size = 16, filled = false, className = "" }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9Z" />
    </svg>
  );
}
function HeartSvg({ size = 16, filled = false, className = "" }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19.5 12.6 12 20l-7.5-7.4A5.2 5.2 0 1 1 12 6.2a5.2 5.2 0 1 1 7.5 6.4Z" />
    </svg>
  );
}
function FolderSvg({ size = 16, className = "", filled = false }: { size?: number; className?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}
function FileSvg({ size = 16, className = "", filled = false }: { size?: number; className?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
function PinSvg({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/* ---------- 条目与分组脚手架 ---------- */

type EntryStatus = "live" | "lib" | "r21" | "r22" | "r23";
const STATUS_LABEL: Record<EntryStatus, string> = {
  live: "已落地 · 产品页在用",
  lib: "库页演示",
  r21: "R2-1 表格基建",
  r22: "R2-2 共享行组件",
  r23: "R2-3 总览 / 群组页",
};
const STATUS_TONE: Record<EntryStatus, "success" | "accent" | "warning" | "neutral"> = {
  live: "success",
  lib: "accent",
  r21: "warning",
  r22: "warning",
  r23: "warning",
};

function Entry({ id, name, href, status, note, goLabel, onGo, children }: {
  id: string;
  name: string;
  href: string;
  status: EntryStatus;
  note: string;
  goLabel?: string;
  onGo?: () => void;
  children: ReactNode;
}) {
  return (
    <section id={`entry-${id}`} data-entry={id} aria-label={name} className="scroll-mt-28 rounded-2xl bg-[var(--surface-2)] p-3">
      <div className="rounded-xl bg-[var(--surface)] shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight">{name}</h3>
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--dim)]">{note} <a className="text-[var(--accent)] underline underline-offset-2" href={href} target="_blank" rel="noreferrer">Pro 文档 ↗</a></p>
        </div>
        {onGo && <Button size="sm" variant="secondary" onClick={onGo}>{goLabel ?? "去产品页看"}</Button>}
      </div>
      <div className="px-4 py-4">{children}</div>
      </div>
    </section>
  );
}

function Section({ id, title, desc, children }: { id: string; title: string; desc: string; children: ReactNode }) {
  return (
    <section id={`section-${id}`} data-section={id} aria-label={title} className="scroll-mt-24">
      <div className="mb-3">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-xs leading-5 text-[var(--dim)]">{desc}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

const PRO = (slug: string) => `https://heroui.pro/docs/react/components/${slug}`;

function useNowMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/* ---------- 一、外壳与已落地 ---------- */

function ShellSection({ navigate }: { navigate?: NavigateFn }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <Section id="shell" title="外壳与已落地" desc="AppLayout / Sidebar / Navbar 是本控制台正在用的外壳——你现在看的页面本身就是演示。Drawer / Dropdown / Toast 已在产品页落地，条目只写清所在页面并链过去，不重复造一份。">
      <Entry id="app-layout" name="AppLayout" href={PRO("app-layout")} status="live" note="手写 flex 骨架：左侧栏 + 右列顶栏 sticky + 主内容列 + 可选 toolbar / footer；aside 插槽按 Pro 结构建（可选、默认关、不占位，320px，移动端改 Sheet）。" goLabel="看总览页" onGo={() => navigate?.("overview")}>
        <p className="text-xs leading-5 text-[var(--dim)]">当前外壳：桌面侧栏 w-60 / 折叠 w-12 图标轨（Cmd/Ctrl+B 切换），断点 md 768px 切移动端抽屉、lg 1024px 隐藏 aside；折叠态存 localStorage（sidebar_state）。</p>
      </Entry>
      <Entry id="sidebar" name="Sidebar" href={PRO("sidebar")} status="live" note="导航用免费 ListBox + DisclosureGroup 分组 + Separator；图标轨时每项配 Tooltip；底部 Avatar + Dropdown；移动端抽屉与桌面侧栏共用同一份导航内容。" goLabel="看总览页" onGo={() => navigate?.("overview")}>
        <p className="text-xs leading-5 text-[var(--dim)]">侧栏分组：工作台 / 配置 / 群组与成员 / 记录；本库页挂在新增的“设置”分组下（set-once 功能收进折叠入口，不占主菜单）。</p>
      </Entry>
      <Entry id="navbar" name="Navbar" href={PRO("navbar")} status="live" note="顶栏手写 header（sticky h-16）：折叠按钮 + Breadcrumbs + 纵向 Separator + 页面搜索 + 主题切换 + Avatar + Dropdown 用户菜单；floating 变体用 Tailwind；hideOnScroll 第一期不做。" goLabel="看总览页" onGo={() => navigate?.("overview")}>
        <p className="text-xs leading-5 text-[var(--dim)]">面包屑显示当前分组 / 页面；主题切换与 ThemeController 共用同一份 useTheme 状态。</p>
      </Entry>
      <Entry id="drawer" name="Drawer（已落地）" href={PRO("app-layout")} status="live" note="免费 Drawer + DrawerFooter，处置按钮固定底部；队列详情、群详情、审计详情都走它。本条目不重复造一份，直接去队列页点一条条目看真的抽屉。" goLabel="去查杀队列" onGo={() => navigate?.("queue")}>
        <p className="text-xs leading-5 text-[var(--dim)]">抽屉开 / 关不碰路由、不重挂列表页；处置提交成功后清掉该条目的 dispSel（R3 语义）。</p>
      </Entry>
      <Entry id="dropdown" name="Dropdown（已落地）" href={PRO("app-layout")} status="live" note="免费 Dropdown（自带 portal）：队列行“更多”菜单、用户菜单、群组菜单都在用。下面这个是真的 Dropdown，点开可用。" goLabel="去查杀队列" onGo={() => navigate?.("queue")}>
        <Dropdown>
          <Dropdown.Trigger aria-label="演示菜单" className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] px-3 text-xs font-medium">
            点开看菜单 <Icon name="chevron" size={14} />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu aria-label="演示菜单" onAction={(k) => toast.success(`选了：${String(k)}`)}>
              <Dropdown.Item id="allow" textValue="放行"><Label>放行</Label></Dropdown.Item>
              <Dropdown.Item id="delete" textValue="删除"><Label>删除消息</Label><Label>不可恢复</Label></Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </Entry>
      <Entry id="toast" name="Toast（已落地）" href={PRO("app-layout")} status="live" note="免费 Toast（ToastProvider 在 main.tsx 全站挂载）：批量处置、标记复核、加入豁免的成功提示都走它。点下面按钮真的会弹一条 Toast。">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} onClick={() => toast.success("演示：这是一条成功提示。")}>弹成功提示</Button>
          <Button size="sm" variant="secondary" onClick={() => toast.info("演示：这是一条普通提示。")}>弹普通提示</Button>
          <Button size="sm" variant="secondary" onClick={() => toast.danger("演示：这是一条错误提示。")}>弹错误提示</Button>
        </div>
      </Entry>
      <Entry id="modal-sheet" name="Modal / Sheet（免费组件直用）" href={PRO("app-layout")} status="live" note="免费 Modal 与 Sheet：确认弹窗走 ui.tsx 的 Modal（与产品页同一份代码），移动端导航抽屉与右侧面板移动版走 Sheet。">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} onClick={() => setModalOpen(true)}>打开 Modal（ui.tsx 同款）</Button>
          <Button size="sm" variant="secondary" onClick={() => setSheetOpen(true)}>打开 Sheet（右侧面板）</Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="演示弹窗" desc="这是 ui.tsx 的 Modal，与产品页确认弹窗同一份代码。">
          <p className="text-sm leading-6">点遮罩、按 Esc 或点右上 X 都能关；进出场动画与卸载由 HeroUI 管。</p>
        </Modal>
        <HeroSheet isOpen={sheetOpen} onOpenChange={setSheetOpen} placement="right">
          <HeroSheet.Backdrop>
            <HeroSheet.Content>
              <HeroSheet.Dialog>
                <HeroSheet.Header><HeroSheet.Heading>演示 Sheet</HeroSheet.Heading></HeroSheet.Header>
                <HeroSheet.Body><p className="text-sm leading-6">右侧滑出的面板，移动端 aside 与导航抽屉都用它。</p></HeroSheet.Body>
              </HeroSheet.Dialog>
            </HeroSheet.Content>
          </HeroSheet.Backdrop>
        </HeroSheet>
      </Entry>
    </Section>
  );
}

/* ---------- 二、数据展示 ---------- */

const TREND_DATA = [
  { d: "11-19", v: 42 }, { d: "11-20", v: 58 }, { d: "11-21", v: 51 }, { d: "11-22", v: 73 },
  { d: "11-23", v: 66 }, { d: "11-24", v: 81 }, { d: "11-25", v: 94 },
];
const CAT_DATA = [
  { name: "广告", value: 38 }, { name: "钓鱼链接", value: 21 }, { name: "刷屏", value: 14 }, { name: "色情", value: 9 }, { name: "其他", value: 18 },
];
const CAT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function ChartTooltipCard({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 shadow-xl">
      {label !== undefined && <p className="text-xs font-medium text-slate-400">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-xs leading-5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color ?? "var(--chart-3)" }} />
          <span className="flex-1 text-slate-400">{p.name}</span>
          <span className="font-semibold text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* C02：库页内嵌一张 TanStack 真表（R2-1 表基建：useAppTable + TableHead
 * + TableWrap + Td + flexRender；mock 用户 5 行，表头可点排序，Name 列
 * 带照片头像）。表字号用 [&_.data-table]:text-sm 顶到 14px（TableWrap
 * 自带 text-[13px]，ui.tsx 不在本批范围）。 */
type LibUserRow = { name: string; title: string; email: string; role: string; status: "在职" | "休假" };
const LIB_USER_ROWS: LibUserRow[] = [
  { name: "Ada", title: "群组运营", email: "ada@example.com", role: "管理员", status: "在职" },
  { name: "Grace", title: "内容复核", email: "grace@example.com", role: "复核员", status: "在职" },
  { name: "Linus", title: "技术支持", email: "linus@example.com", role: "复核员", status: "休假" },
  { name: "小白", title: "产品经理", email: "xiaobai@example.com", role: "管理员", status: "在职" },
  { name: "老板", title: "群主", email: "boss@example.com", role: "群主", status: "在职" },
];
function DataGridDemo() {
  const [sort, setSort] = useState<SimpleSort<"name" | "title" | "email" | "role">>({ key: null, dir: "asc" });
  const [visible, setVisible] = useState<ColumnVisibilityState>({});
  const columns = useMemo<AppColumnDef<LibUserRow>[]>(() => [
    { accessorKey: "name", header: "Name", meta: { sortable: true }, cell: ({ row }) => (
      <span className="flex items-center gap-2"><PhotoAvatar name={row.original.name} size={28} /><span className="font-medium text-[var(--text)]">{row.original.name}</span></span>
    ) },
    { accessorKey: "title", header: "Title", meta: { sortable: true }, cell: ({ row }) => row.original.title },
    { accessorKey: "email", header: "Email", meta: { sortable: true }, cell: ({ row }) => <span className="font-mono2">{row.original.email}</span> },
    { accessorKey: "role", header: "Role", meta: { sortable: true }, cell: ({ row }) => <Badge tone={row.original.role === "管理员" ? "accent" : row.original.role === "群主" ? "dark" : "neutral"}>{row.original.role}</Badge> },
    { id: "status", header: "状态", enableSorting: false, cell: ({ row }) => <Badge tone={row.original.status === "在职" ? "success" : "warning"}>{row.original.status}</Badge> },
    { id: "actions", header: "操作", enableSorting: false, enableHiding: false, meta: { className: "text-right" }, cell: () => <Button size="sm" variant="outline" onClick={() => toast.info("演示：编辑用户（mock）。")}>Edit</Button> },
  ], []);
  const table = useAppTable({
    data: LIB_USER_ROWS,
    columns,
    getRowId: (r) => r.name,
    state: { sorting: sortingFromSort(sort), columnVisibility: visible },
    onSortingChange: makeSortingChangeHandler(sort, setSort),
    onColumnVisibilityChange: setVisible,
  });
  return (
    <div className="overflow-hidden rounded-xl border-0 bg-[var(--surface)] shadow-[var(--shadow-md)] [&_.data-table]:text-sm">
      <TableWrap>
        <TableHead table={table} />
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-[var(--surface-2)]">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={`border-b border-[var(--border)] px-4 py-2 align-middle text-[var(--text-2)] ${cell.column.columnDef.meta?.className ?? ""}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

function DataSection({ navigate }: { navigate?: NavigateFn }) {
  const [selKeys, setSelKeys] = useState<Set<string>>(new Set());
  const [listMode, setListMode] = useState<"none" | "single" | "multiple">("multiple");
  const [listVariant, setListVariant] = useState<"primary" | "secondary">("primary");
  const [itemLayout, setItemLayout] = useState<"list" | "grid">("list");
  const [itemVariant, setItemVariant] = useState("default");
  const [cellSwitch, setCellSwitch] = useState(true);
  return (
    <Section id="data" title="数据展示" desc="表格本身是 R2-1 的事（TanStack Table 数据层 + 手写渲染层）；这里演示表格之外的展示形态：空态、批量操作栏、列表、条目行、仪表盘容器、KPI 与 7 张 Recharts 图。">
      <Entry id="data-grid" name="DataGrid" href={PRO("data-grid")} status="r21" note="不用 DataGrid、不用 HeroUI Table。数据层由 @tanstack/react-table 负责，渲染层手写 table + Tailwind；状态用免费 Chip，行操作用 Dropdown + Button，分页用免费 Pagination。表格基建在 R2-1 并行出稿，本条目只作指向。" goLabel="去查杀队列看真表" onGo={() => navigate?.("queue")}>
        <DataGridDemo />
        <p className="mt-3 text-xs leading-5 text-[var(--dim)]">表头可点排序；13 类分布表保留 w-full + min-w 640 + sticky 操作列，表宽 = 卡宽有硬断言（R2 验收）。</p>
      </Entry>
      <Entry id="empty-state" name="EmptyState" href={PRO("empty-state")} status="lib" note="手写空态视觉：圆形 muted 背景图标 + h3 标题 + 描述 + 免费 Button；sm / md / lg 三档用 padding / gap 切。用的就是 ui.tsx 的 EmptyState，与产品页同一份代码。">
        <div className="grid gap-3 sm:grid-cols-3">
          <EmptyState icon="inbox" title="暂无数据" desc="当前筛选下没有条目。" action={<Button size="sm" variant="secondary" onClick={() => toast.info("演示：已点“清空筛选”。")}>清空筛选</Button>} />
          <EmptyState icon="search" title="没搜到" desc="换个关键词试试。" />
          <EmptyState icon="shield" title="全部干净" desc="本群最近 7 天 0 命中。" />
        </div>
      </Entry>
      <Entry id="action-bar" name="ActionBar" href={PRO("action-bar")} status="lib" note="拼成免费 Toolbar：浮动底部居中 pill，选中数 > 0 时浮现；640px 以下按钮文字隐藏只留图标。先在下面列表里勾几行，底部会出现真的操作栏。">
        <ListBox
          aria-label="批量操作演示列表"
          selectionMode="multiple"
          selectedKeys={selKeys}
          onSelectionChange={(k) => setSelKeys(new Set([...(k === "all" ? MOCK_MSGS.map((m) => String(m.id)) : k)].map(String)))}
          className="rounded-[10px] border border-[var(--border)] p-1"
        >
          {MOCK_MSGS.map((m) => (
            <ListBox.Item key={m.id} id={String(m.id)} textValue={`${m.user} ${m.text}`} className="flex items-center gap-2 rounded-lg px-2 py-2.5">
              <PhotoAvatar name={m.user} size={28} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{m.user}</span><span className="block truncate text-xs text-[var(--dim)]">{m.text}</span></span>
              <span className="text-xs text-[var(--dim)]">{m.time}</span>
            </ListBox.Item>
          ))}
        </ListBox>
        {selKeys.size > 0 && (
          <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 shadow-lg">
              <HeroChip size="sm" color="accent">已选 {selKeys.size}</HeroChip>
              <Separator orientation="vertical" className="h-5" />
              <Button size="sm" variant="ghost" onClick={() => { toast.success(`演示：已导出 ${selKeys.size} 条。`); setSelKeys(new Set()); }}>导出</Button>
              <Button size="sm" variant="ghost" onClick={() => { toast.success(`演示：已归档 ${selKeys.size} 条。`); setSelKeys(new Set()); }}>归档</Button>
              <Separator orientation="vertical" className="h-5" />
              <Button size="sm" variant="ghost" aria-label="清除选择" onClick={() => setSelKeys(new Set())}><Icon name="x" size={16} /></Button>
            </div>
          </div>
        )}
      </Entry>
      <Entry id="list-view" name="ListView" href={PRO("list-view")} status="lib" note="根列表用免费 ListBox（键盘导航、typeahead、选择），行内结构手写：图标 / Avatar + 标题 + 描述 + 尾部操作槽；primary 是灰底 wrapper + 白色 surface 行，secondary 是透明行 + 底边框。">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Segmented value={listMode} onChange={setListMode} ariaLabel="选择模式" options={[{ value: "none", label: "不选" }, { value: "single", label: "单选" }, { value: "multiple", label: "多选" }]} />
          <Segmented value={listVariant} onChange={setListVariant} ariaLabel="视觉变体" options={[{ value: "primary", label: "primary" }, { value: "secondary", label: "secondary" }]} />
        </div>
        <ListBox
          aria-label="会话列表演示"
          selectionMode={listMode}
          className={listVariant === "primary" ? "rounded-2xl bg-[var(--surface-2)] p-1" : ""}
        >
          {MOCK_MSGS.map((m) => (
            <ListBox.Item key={m.id} id={String(m.id)} textValue={`${m.user} ${m.text}`} className={listVariant === "primary" ? "flex items-center gap-2 rounded-xl bg-[var(--surface)] px-2 py-2.5" : "flex items-center gap-2 border-b border-[var(--border)] px-2 py-2.5"}>
              <PhotoAvatar name={m.user} size={30} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{m.user}</span><span className="block truncate text-xs text-[var(--dim)]">{m.text}</span></span>
              <span className="text-xs text-[var(--dim)]">{m.time}</span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Entry>
      <Entry id="item-card" name="ItemCard / ItemCardGroup" href={PRO("item-card")} status="lib" note="手写横向 row：图标容器 + 标题 / 描述（截断）+ 尾部操作槽（Switch / Select / Button）；分组容器 list 纵向 + 分隔线，或 grid 2–3 列；五档变体 default / secondary / tertiary / outline / transparent。">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Segmented value={itemLayout} onChange={setItemLayout} ariaLabel="分组布局" options={[{ value: "list", label: "list" }, { value: "grid", label: "grid" }]} />
          <Select aria-label="变体" selectedKey={itemVariant} onSelectionChange={(k) => { if (k) setItemVariant(String(k)); }} className="w-36">
            <option value="default">default</option>
            <option value="secondary">secondary</option>
            <option value="tertiary">tertiary</option>
            <option value="outline">outline</option>
            <option value="transparent">transparent</option>
          </Select>
        </div>
        <h3 className="mb-1 text-sm font-semibold">群组</h3>
        <p className="mb-2 text-xs text-[var(--dim)]">4 个群 · 监控中</p>
        <div className={itemLayout === "grid" ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
          {MOCK_GROUPS.map((g) => (
            <div key={g} className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${itemVariant === "outline" ? "border border-[var(--border)] bg-transparent" : itemVariant === "transparent" ? "bg-transparent" : itemVariant === "secondary" ? "bg-[var(--surface-2)]" : itemVariant === "tertiary" ? "bg-[var(--surface-3)]" : "bg-[var(--surface)] shadow-sm ring-1 ring-[var(--border)]"}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-3)]"><Icon name="users" size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{g}</span><span className="block truncate text-xs text-[var(--dim)]">监控中 · 今日 0 命中</span></span>
              <Switch label={`${g} 监控开关`} checked={cellSwitch} onChange={setCellSwitch} />
            </div>
          ))}
        </div>
      </Entry>
      <Entry id="widget" name="Widget" href={PRO("widget")} status="r23" note="手写容器：surface-secondary 外壳 + bg-surface 抬高内容区 + 头部标题 / 图例 + 可选底部行；图例颜色用 var(--chart-N)。总览页的图表 / 表格卡片外壳按这个拼，R2-3 落地。">
        <div className="rounded-[10px] bg-[var(--surface-2)] p-3">
          <div className="flex items-center justify-between px-1 pb-2">
            <div><h3 className="text-sm font-semibold">7 日命中趋势</h3><p className="text-xs text-[var(--dim)]">全部群组</p></div>
            <span className="flex items-center gap-1.5 text-xs text-[var(--dim)]"><span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-1, #0e7490)" }} />命中</span>
          </div>
          <div className="rounded-lg bg-[var(--surface)] p-2 shadow-sm">
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} width={28} />
                  <RechartsTooltip content={<ChartTooltipCard />} />
                  <Area type="monotone" dataKey="v" name="命中" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="px-1 pt-2 text-xs text-[var(--dim)]">底部行：较昨日 +18% · 数据截至今日 01:00。</p>
        </div>
      </Entry>
    </Section>
  );
}

/* ---------- 三、指标卡与图表 ---------- */

function TrendChipDemo({ trend, value }: { trend: "up" | "down" | "neutral"; value: string }) {
  // R2-3 修正批：改引共享 TrendChip（../components/kpi），底/字色经
  // trendChipToneClass 钉死到控制台 token；本地裸 HeroChip soft 在同样
  // 构建（丢 @supports color-mix 定义）下文字会隐形。
  return <TrendChip trend={trend} value={value} />;
}

function KpiChartsSection() {
  const [numStyle, setNumStyle] = useState<"decimal" | "currency" | "percent" | "compact">("decimal");
  const [numValue, setNumValue] = useState(12840);
  const formatted = useMemo(() => {
    try {
      if (numStyle === "currency") return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(numValue);
      if (numStyle === "percent") return new Intl.NumberFormat("zh-CN", { style: "percent", maximumFractionDigits: 1 }).format(numValue / 100);
      if (numStyle === "compact") return new Intl.NumberFormat("zh-CN", { notation: "compact" }).format(numValue);
      return new Intl.NumberFormat("zh-CN").format(numValue);
    } catch {
      return String(numValue);
    }
  }, [numStyle, numValue]);
  const kpis = [
    { title: "今日命中", value: "128", trend: "up" as const, pct: "+18%", spark: TREND_DATA, progress: 0.64 },
    { title: "待处理", value: "12", trend: "down" as const, pct: "-9%", spark: [...TREND_DATA].reverse(), progress: 0.32 },
    { title: "误杀率", value: "1.8%", trend: "neutral" as const, pct: "±0", spark: TREND_DATA.map((d) => ({ ...d, v: 100 - d.v })), progress: 0.18 },
  ];
  return (
    <Section id="charts" title="指标卡与图表" desc="KPI 是免费 Card 外壳（dl 语义）+ Intl.NumberFormat 大号数字 + Chip 拼的 TrendChip + Recharts 面积迷你图；7 张图全部直接用 Recharts（Pro 图表底层就是 Recharts + 主题覆盖），tooltip 是手写的同款卡片。">
      <Entry id="kpi" name="KPI / KPIGroup / TrendChip / NumberValue" href={PRO("kpi")} status="r23" note="KPI：标题 dt、数值 dd，标题行左状态图标、右幽灵图标按钮；TrendChip 是免费 Chip + 方向箭头 + 数值 + 可选前后缀；NumberValue 就是一个 Intl.NumberFormat 的 span；KPIGroup 只是布局容器 + 1px 分隔线。文档全文没提数字滚动动画，不要默认 Pro 自带。">
        <div className="flex flex-col gap-px overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--border)] sm:flex-row">
          {kpis.map((k) => (
            <dl key={k.title} className="min-w-0 flex-1 bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-xs text-[var(--dim)]"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-3)]"><Icon name="chart" size={14} /></span>{k.title}</dt>
                <HeroButton variant="ghost" size="sm" isIconOnly aria-label={`${k.title}更多操作`} className="h-7 w-7"><Icon name="chevron" size={14} /></HeroButton>
              </div>
              <dd className="mt-2 text-2xl font-bold tabular-nums">{k.value}</dd>
              <div className="mt-2 flex items-center gap-2"><TrendChipDemo trend={k.trend} value={k.pct} /><span className="text-xs text-[var(--dim)]">较昨日</span></div>
              <div className="mt-3 h-12 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={k.spark} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                    <Area type="monotone" dataKey="v" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.12} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2"><Progress value={k.progress} tone={k.trend === "down" ? "success" : "accent"} /></div>
            </dl>
          ))}
        </div>
        <div className="mt-4 rounded-[10px] border border-[var(--border)] p-3">
          <Field label="NumberValue 演示：改样式与数值，看 Intl.NumberFormat 的输出" hint="currency 时 currency 必填、unit 时 unit 必填；紧凑格式用 notation=compact。">
            <span className="flex flex-wrap items-center gap-2">
              <Input type="number" aria-label="数值" value={numValue} onChange={(e) => setNumValue(Number(e.target.value) || 0)} className="w-32" />
              <Segmented value={numStyle} onChange={setNumStyle} ariaLabel="数字格式" options={[{ value: "decimal", label: "decimal" }, { value: "currency", label: "currency" }, { value: "percent", label: "percent" }, { value: "compact", label: "compact" }]} />
              <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-3)] px-3 py-1.5 text-sm font-semibold tabular-nums"><span>¥</span>{formatted}<span className="text-xs font-normal text-[var(--dim)]">/ 月</span></span>
            </span>
          </Field>
        </div>
      </Entry>
      <Entry id="charts-8" name="AreaChart / BarChart / LineChart / PieChart / RadarChart / RadialChart / ComposedChart" href={PRO("area-chart")} status="r23" note="直接用 Recharts：ResponsiveContainer + 对应图表 + XAxis / YAxis / CartesianGrid / Tooltip；主题覆盖思路照文档（刻度 10px 弱化、默认隐藏轴线与刻度线、网格线弱化、悬停虚线光标）。Radial 单环优先手绘 SVG。">
        <div className="grid gap-6">
          <Card><CardHeader title="面积图 AreaChart" /><div className="h-56 px-2 pb-2"><ResponsiveContainer width="100%" height="100%"><AreaChart data={TREND_DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} width={28} /><RechartsTooltip content={<ChartTooltipCard />} /><Area type="monotone" dataKey="v" name="命中" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.15} strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Card>
          <Card><CardHeader title="柱状图 BarChart" /><div className="h-56 px-2 pb-2"><ResponsiveContainer width="100%" height="100%"><BarChart data={TREND_DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} width={28} /><RechartsTooltip content={<ChartTooltipCard />} /><Bar dataKey="v" name="命中" fill="var(--chart-3)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
          <Card><CardHeader title="折线图 LineChart" /><div className="h-56 px-2 pb-2"><ResponsiveContainer width="100%" height="100%"><LineChart data={TREND_DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} width={28} /><RechartsTooltip content={<ChartTooltipCard />} /><Line type="monotone" dataKey="v" name="命中" stroke="var(--chart-3)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Card>
          <Card><CardHeader title="饼图 PieChart（data / dataKey 挂在 Pie 上，切片分隔用 paddingAngle）" /><div className="h-56 px-2 pb-2"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={CAT_DATA} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>{CAT_DATA.map((c, i) => <Cell key={c.name} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}</Pie><RechartsTooltip content={<ChartTooltipCard />} /></PieChart></ResponsiveContainer></div></Card>
          <Card><CardHeader title="雷达图 RadarChart" /><div className="h-56 px-2 pb-2"><ResponsiveContainer width="100%" height="100%"><RadarChart data={[{ k: "广告", a: 80, b: 60 }, { k: "钓鱼", a: 65, b: 75 }, { k: "刷屏", a: 50, b: 40 }, { k: "色情", a: 70, b: 55 }, { k: "其他", a: 45, b: 65 }]}><PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="k" tick={{ fontSize: 12, fill: "var(--dim)" }} /><PolarRadiusAxis tick={false} axisLine={false} /><Radar dataKey="a" name="本周" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.25} /><Radar dataKey="b" name="上周" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} /><RechartsTooltip content={<ChartTooltipCard />} /></RadarChart></ResponsiveContainer></div></Card>
          <Card><CardHeader title="径向图 RadialChart（单环手绘 SVG；多环才用 RadialBarChart）" /><div className="flex h-56 items-center justify-center gap-6 px-2 pb-2">
            <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="完成度 72%">
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--surface-3)" strokeWidth="10" />
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--chart-3)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 48 * 0.72} ${2 * Math.PI * 48}`} transform="rotate(-90 60 60)" />
              <text x="60" y="66" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text)">72%</text>
            </svg>
            <div className="h-28 w-40"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="30%" outerRadius="80%" startAngle={90} endAngle={-270} data={[{ name: "A", v: 72 }, { name: "B", v: 45 }]}><RadialBar dataKey="v" background={{ fill: "var(--surface-3)" }}><Cell fill="var(--chart-3)" /><Cell fill="var(--chart-1)" /></RadialBar><RechartsTooltip content={<ChartTooltipCard />} /></RadialBarChart></ResponsiveContainer></div>
          </div></Card>
          <Card><CardHeader title="组合图 ComposedChart（Bar + Line + Area 同图）" /><div className="h-56 px-2 pb-2"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={TREND_DATA.map((d) => ({ ...d, target: 70, forecast: d.v * 0.9 }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: "var(--dim)" }} axisLine={false} tickLine={false} width={28} /><RechartsTooltip content={<ChartTooltipCard />} /><Bar dataKey="v" name="实际" fill="var(--chart-3)" radius={[4, 4, 0, 0]} /><Line type="monotone" dataKey="target" name="目标" stroke="var(--chart-1)" strokeWidth={2} dot={false} /><Area type="monotone" dataKey="forecast" name="预测" stroke="var(--chart-5)" fill="var(--chart-5)" fillOpacity={0.1} strokeWidth={1.5} /></ComposedChart></ResponsiveContainer></div></Card>
          <Card><CardHeader title="ChartTooltip（手写卡片，不是独立通用 tooltip）" /><div className="px-4 pb-4"><p className="text-xs leading-5 text-[var(--dim)]">上面每张图的悬停提示用的就是这张卡片：圆角边框 + 表面背景 + 浮层阴影，标题行放 X 轴标签，每系列一行（8px 圆点指示符 + 系列名 + 数值）；labelFormatter / valueFormatter 用手写函数接 Recharts payload。把鼠标移到任意一张图上试试。</p></div></Card>
        </div>
      </Entry>
    </Section>
  );
}

/* ---------- 四、表单增强 ---------- */

/* Cell* 四件的演示状态在 FormSection 里；预设色表与 HSL 解析已收进
 * 共享组件 cellRows.tsx（颜色初始化必须走 HSL，见该文件头注释）。 */

/* C04/C14：库页 Cell 行抛光态——窄居中（外层 max-w-md）+ 无边框柔阴影 +
 * 行高 48px + 标签 15px（[&_.text-sm] 后代覆盖行内标签字号）。只传给
 * 库页四行（className 覆盖默认行样式），产品页仍走 cellRows.tsx 的
 * CELL_ROW_CLASS。 */
const CELL_ROW_POLISHED_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-2xl border-0 bg-[var(--surface)] px-4 py-1 text-left shadow-[var(--shadow-md)] min-h-12 [&_.text-sm]:text-[15px] [&_.leading-5]:leading-4";

function FormSection() {
  const [cellSel, setCellSel] = useState("24h");
  const [cellSw, setCellSw] = useState(true);
  const [cellSlider, setCellSlider] = useState(70);
  // 颜色只存 hex 字符串；共享组件内部转 HSL 解析（带 hue 通道），
  // 不再由调用方 parseColor（hex 会得 RGBColor、hue 滑杆挂载抛错）。
  const [cellColor, setCellColor] = useState("#0e7490");
  const [cardCheck, setCardCheck] = useState<string[]>(["ads"]);
  const [cardRadio, setCardRadio] = useState("standard");
  const [inlineSel, setInlineSel] = useState("week");
  const [nativeSel, setNativeSel] = useState("");
  const [nativeInvalid, setNativeInvalid] = useState(false);
  const [stepperNum, setStepperNum] = useState(3);
  const [segment, setSegment] = useState("day");
  const [segmentGhost, setSegmentGhost] = useState(false);
  const [step, setStep] = useState(1);
  const [stepVertical, setStepVertical] = useState(false);
  const steps = [
    { title: "选群", desc: "挑一个要接管的群" },
    { title: "配策略", desc: "处置阈值与动作" },
    { title: "开验证", desc: "新人验证方式" },
    { title: "完成", desc: "Bot 进群开始工作" },
  ];
  return (
    <Section id="form" title="表单增强" desc="Cell* 四件是 R2-2 的共享行组件（标签左、值右、整行可点，移动端设置行首选）；卡片式多选 / 单选、行内下拉、原生下拉、数字步进、分段控制、步骤指示都在这里。">
      <Entry id="cell" name="CellSelect / CellSwitch / CellSlider / CellColorPicker" href={PRO("cell-select")} status="r22" note="本质都是免费同名组件的单元格样式包装。R2-2 已做成共享行组件（client/src/components/cellRows.tsx），下面四行直接引用同一份实现——整行可点（点文字区也触发，点控件本身不重复触发）。">
        <div className="mx-auto max-w-md space-y-2">
          <CellSelect label="禁言时长" description="刷屏触发后禁言多久" ariaLabel="禁言时长" value={cellSel} onChange={setCellSel} className={CELL_ROW_POLISHED_CLASS} options={[{ value: "1h", label: "1 小时" }, { value: "24h", label: "24 小时" }, { value: "7d", label: "7 天" }]} />
          <CellSwitch label="新人验证" description="新成员进群先验证再说话" ariaLabel="新人验证" checked={cellSw} onChange={setCellSw} className={CELL_ROW_POLISHED_CLASS} />
          <CellSlider label="信任分阈值" description="低于此分进人工复核" ariaLabel="信任分阈值" value={cellSlider} onChange={setCellSlider} minValue={0} maxValue={100} className={CELL_ROW_POLISHED_CLASS} />
          <CellColorPicker label="群组标识色" description="点色块打开颜色面板" value={cellColor} onChange={setCellColor} className={CELL_ROW_POLISHED_CLASS} />
        </div>
      </Entry>
      <Entry id="check-radio-cards" name="CheckboxButtonGroup / RadioButtonGroup" href={PRO("checkbox-button-group")} status="lib" note="免费 CheckboxGroup + Checkbox / RadioGroup + Radio 拼卡片式选项：卡片 + 标题 / 描述 + 右上角指示器，选中加 accent ring；layout 用 flex / grid 切换。">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--dim)]">多选：要拦截的类别（卡片式）</p>
            <HeroCheckboxGroup value={cardCheck} onChange={setCardCheck} aria-label="拦截类别" className="grid gap-2">
              {[{ v: "ads", t: "广告", d: "含推广链接、联系方式" }, { v: "phish", t: "钓鱼链接", d: "仿冒登录、盗号链接" }, { v: "flood", t: "刷屏", d: "短时间大量重复消息" }].map((o) => (
                <HeroCheckbox key={o.v} value={o.v} className="rounded-[10px] border border-[var(--border)] px-3 py-2.5 data-[selected=true]:ring-2 data-[selected=true]:ring-[var(--accent)]">
                  <HeroCheckbox.Content className="items-start gap-2.5">
                    <HeroCheckbox.Control><HeroCheckbox.Indicator /></HeroCheckbox.Control>
                    <span><span className="block text-[13px] font-medium">{o.t}</span><span className="block text-xs text-[var(--dim)]">{o.d}</span></span>
                  </HeroCheckbox.Content>
                </HeroCheckbox>
              ))}
            </HeroCheckboxGroup>
            <p className="mt-2 text-xs text-[var(--dim)]">已选：{cardCheck.length ? cardCheck.join("、") : "无"}</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--dim)]">单选：处置强度（卡片式，RadioGroup 保证互斥）</p>
            <RadioGroup value={cardRadio} onChange={setCardRadio} aria-label="处置强度" className="grid gap-2">
              {[{ v: "loose", t: "宽松", d: "只删高置信度广告" }, { v: "standard", t: "标准", d: "默认阈值，误杀进复核" }, { v: "strict", t: "严格", d: "低分也进队列人工看" }].map((o) => (
                <Radio key={o.v} value={o.v} className="rounded-[10px] border border-[var(--border)] px-3 py-2.5 data-[selected=true]:ring-2 data-[selected=true]:ring-[var(--accent)]">
                  <Radio.Content className="items-start gap-2.5">
                    <Radio.Control><Radio.Indicator /></Radio.Control>
                    <span><span className="block text-[13px] font-medium">{o.t}</span><span className="block text-xs text-[var(--dim)]">{o.d}</span></span>
                  </Radio.Content>
                </Radio>
              ))}
            </RadioGroup>
            <p className="mt-2 text-xs text-[var(--dim)]">当前：{cardRadio}</p>
          </div>
        </div>
      </Entry>
      <Entry id="inline-native-select" name="InlineSelect / NativeSelect" href={PRO("inline-select")} status="lib" note="行内下拉：免费 Select 做 ghost 样式（无边框、无背景、值截断限宽 12rem）；原生下拉：免费版无同名组件，原生 select 直接写 + 自套样式包装，isInvalid 时显示 FieldError、隐藏 Description。">
        <p className="text-sm leading-7">最近
          <HeroSelect aria-label="行内时间范围" selectedKey={inlineSel} onSelectionChange={(k) => { if (k) setInlineSel(String(k)); }} className="mx-1 inline-flex align-middle">
            <HeroSelect.Trigger className="inline-flex h-7 items-center gap-1 rounded-md border-0 bg-transparent px-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--surface-3)]">
              <HeroSelect.Value className="max-w-48 truncate" />
              <HeroSelect.Indicator />
            </HeroSelect.Trigger>
            <HeroSelect.Popover>
              <ListBox aria-label="时间范围">
                <ListBox.Item id="day" textValue="今天">今天<ListBox.ItemIndicator /></ListBox.Item>
                <ListBox.Item id="week" textValue="本周">本周<ListBox.ItemIndicator /></ListBox.Item>
                <ListBox.Item id="month" textValue="本月">本月<ListBox.ItemIndicator /></ListBox.Item>
              </ListBox>
            </HeroSelect.Popover>
          </HeroSelect>
          的命中是 128 条。
        </p>
        <div className="mt-4 max-w-sm">
          <Field label="原生下拉：导出格式" hint={nativeInvalid ? undefined : "选一个格式，点“校验”试试空值报错。"} >
            <span className="relative block">
              <select aria-label="导出格式" value={nativeSel} onChange={(e) => { setNativeSel(e.target.value); setNativeInvalid(false); }} className={`w-full appearance-none rounded-lg border bg-[var(--surface)] px-3 py-2 pr-8 text-[13px] ${nativeInvalid ? "border-[var(--danger)]" : "border-[var(--border)]"}`}>
                <option value="">请选择…</option>
                <option value="csv">CSV 表格</option>
                <option value="json">JSON</option>
              </select>
              <Icon name="chevron" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-[var(--dim)]" />
            </span>
          </Field>
          {nativeInvalid && <p role="alert" className="mt-1 text-xs text-[var(--danger)]">请选择一个导出格式。</p>}
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => { if (!nativeSel) { setNativeInvalid(true); } else { toast.success(`演示：按 ${nativeSel.toUpperCase()} 导出（mock，未调接口）。`); } }}>校验并导出</Button>
        </div>
      </Entry>
      <Entry id="number-stepper" name="NumberStepper" href={PRO("number-stepper")} status="lib" note="RAC NumberField + Group + 两个 slot 按钮（减 / 加）+ 中间数字显示；动画数字如不需要先用普通文本，Number Flow 只在要做数字滚动动画时再接。">
        <div className="flex flex-wrap items-center gap-4">
          <NumberField aria-label="每页条数" value={stepperNum} onChange={setStepperNum} minValue={1} maxValue={10} step={1}>
            <NumberField.Group className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-1">
              <NumberField.DecrementButton aria-label="减少" className="flex h-10 w-10 items-center justify-center rounded-md text-base hover:bg-[var(--surface-3)]">−</NumberField.DecrementButton>
              <NumberField.Input className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none" />
              <NumberField.IncrementButton aria-label="增加" className="flex h-10 w-10 items-center justify-center rounded-md text-base hover:bg-[var(--surface-3)]">+</NumberField.IncrementButton>
            </NumberField.Group>
          </NumberField>
          <p className="text-xs text-[var(--dim)]">每页 {stepperNum} 条（mock）；直接在框里输数字、点加减、按上下键都行。</p>
        </div>
      </Entry>
      <Entry id="segment" name="Segment" href={PRO("segment")} status="lib" note="用免费 ToggleButtonGroup（与 Pro 同源，单选模式）+ 每个选项一个 ToggleButton，背后加滑动指示器；或用免费 Tabs 做分段切换。ghost 变体用样式实现。下面是 ui.tsx 的 Segmented（同一份代码，产品页在用）。">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented value={segment} onChange={setSegment} ariaLabel="时间范围" options={[{ value: "day", label: "今天" }, { value: "week", label: "本周" }, { value: "month", label: "本月" }]} />
          <label className="flex items-center gap-2 text-xs"><Switch label="ghost 变体" checked={segmentGhost} onChange={setSegmentGhost} /> ghost 变体（透明容器 + accent 选中指示）</label>
          <span className="text-xs text-[var(--dim)]">当前：{segment}{segmentGhost ? " · ghost" : ""}</span>
        </div>
      </Entry>
      <Entry id="stepper" name="Stepper" href={PRO("stepper")} status="lib" note="按文档结构手写：原生 ol + li，每步一个可点击的 Button（有 onStepChange 时才可点）+ 圆形指示器（数字 / 图标 / 完成对勾）+ 标题 / 描述 + 连接线（track + 按进度填充的 fill），状态用 data-status 驱动样式。">
        <div className="mb-3 flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" onClick={() => setStep((s) => clamp(s - 1, 0, steps.length - 1))}>上一步</Button>
          <Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} onClick={() => setStep((s) => clamp(s + 1, 0, steps.length - 1))}>下一步</Button>
          <label className="flex items-center gap-2 text-xs"><Switch label="纵向" checked={stepVertical} onChange={setStepVertical} /> 纵向</label>
        </div>
        <ol className={stepVertical ? "space-y-0" : "flex items-start"} aria-label="接管向导">
          {steps.map((s, i) => {
            const status = i < step ? "complete" : i === step ? "active" : "inactive";
            return (
              <li key={s.title} data-status={status} className={stepVertical ? "flex gap-3 pb-5 last:pb-0" : "min-w-0 flex-1"}>
                <span className={stepVertical ? "flex flex-col items-center" : "flex items-center"}>
                  <button type="button" onClick={() => setStep(i)} aria-current={status === "active" ? "step" : undefined} aria-label={`第 ${i + 1} 步：${s.title}${status === "complete" ? "（已完成）" : status === "active" ? "（进行中）" : ""}`} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ${status === "complete" ? "bg-[var(--accent)] text-white ring-[var(--accent)] " + LIB_DARK_ACCENT_FIX_CLASS : status === "active" ? "bg-[var(--surface)] text-[var(--accent)] ring-[var(--accent)]" : "bg-[var(--surface-3)] text-[var(--dim)] ring-[var(--border)]"}`}>
                    {status === "complete" ? "✓" : i + 1}
                  </button>
                  {i < steps.length - 1 && (
                    <span aria-hidden="true" className={stepVertical ? "mt-1 w-0.5 flex-1 bg-[var(--border)]" : "mx-1 h-0.5 min-w-4 flex-1 bg-[var(--border)]"}>
                      <span className="block h-full bg-[var(--accent)]" style={{ width: stepVertical ? "100%" : i < step ? "100%" : "0%", height: stepVertical ? (i < step ? "100%" : "0%") : "100%" }} />
                    </span>
                  )}
                </span>
                <span className={stepVertical ? "pb-1" : "mt-2 block pr-2"}>
                  <span className={`block text-[13px] font-medium ${status === "inactive" ? "text-[var(--dim)]" : ""}`}>{s.title}</span>
                  <span className="block text-xs text-[var(--dim)]">{s.desc}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Entry>
    </Section>
  );
}

/* ---------- 五、交互与浮层（R2-5） ---------- */

const COMMANDS: { group: string; items: { id: string; label: string; hint: string; run: string }[] }[] = [
  { group: "导航", items: [
    { id: "go-overview", label: "去总览", hint: "G O", run: "overview" },
    { id: "go-queue", label: "去查杀队列", hint: "G Q", run: "queue" },
    { id: "go-library", label: "去组件库", hint: "G L", run: "library" },
  ] },
  { group: "操作", items: [
    { id: "act-refresh", label: "刷新总览数据", hint: "R", run: "refresh" },
    { id: "act-export", label: "导出今日命中", hint: "E", run: "export" },
  ] },
  { group: "群组", items: MOCK_GROUPS.map((g) => ({ id: `group-${g}`, label: `打开群组 ${g}`, hint: "", run: g })) },
];

function CommandDemo({ navigate }: { navigate?: NavigateFn }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const state = useOverlayState({ isOpen: open, onOpenChange: setOpen });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setOpen((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const q = query.trim().toLowerCase();
  const filtered = COMMANDS.map((g) => ({ ...g, items: g.items.filter((i) => !q || i.label.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0);
  const run = (item: { id: string; label: string; run: string }) => {
    setOpen(false); setQuery("");
    if (item.run === "overview" || item.run === "queue" || item.run === "library") { navigate?.(item.run as RouteTab); return; }
    toast.success(`演示：已执行“${item.label}”（mock，未调接口）。`);
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" className="border border-[var(--border)] bg-[var(--surface)]" style={{ borderRadius: 999 }} onClick={() => setOpen(true)}>打开命令面板 <kbd className="rounded border border-[var(--border)] bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px]">⌘K</kbd></Button>
        <span className="text-xs text-[var(--dim)]">过滤默认不区分大小写包含匹配；空结果有 empty state。</span>
      </div>
      <HeroModal state={state}>
        <HeroModal.Backdrop>
          <HeroModal.Container placement="top" scroll="inside" size="md">
            <HeroModal.Dialog className="mt-[15vh] max-h-[70dvh] rounded-2xl p-0">
              <HeroModal.Body className="p-0">
                <div className="border-b border-[var(--border)] p-2">
                  <SearchField aria-label="搜索命令" value={query} onChange={setQuery} autoFocus>
                    <SearchField.Group className="flex items-center gap-2 rounded-lg px-2">
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Search commands..." className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                </div>
                {filtered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--dim)]">没有匹配“{query}”的命令。</p>
                ) : (
                  <ListBox aria-label="命令列表" onAction={(k) => { const item = COMMANDS.flatMap((g) => g.items).find((i) => i.id === String(k)); if (item) run(item); }} className="max-h-80 overflow-y-auto p-1.5">
                    {filtered.map((g) => (
                      <ListBox.Section key={g.group} aria-label={g.group}>
                        <ListBox.Item id={`__h-${g.group}`} textValue={g.group} isDisabled className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--dim)]">{g.group}</ListBox.Item>
                        {g.items.map((i) => (
                          <ListBox.Item key={i.id} id={i.id} textValue={i.label} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-[13px]">
                            {i.label}
                            {i.hint && <kbd className="rounded border border-[var(--border)] bg-[var(--surface-3)] px-1 py-0.5 text-[10px]">{i.hint}</kbd>}
                          </ListBox.Item>
                        ))}
                      </ListBox.Section>
                    ))}
                  </ListBox>
                )}
              </HeroModal.Body>
            </HeroModal.Dialog>
          </HeroModal.Container>
        </HeroModal.Backdrop>
      </HeroModal>
    </div>
  );
}

function ContextMenuDemo() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [sub, setSub] = useState(false);
  const longPress = useRef<number | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => { setMenu(null); setSub(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", onKey); };
  }, [menu]);
  const openAt = (x: number, y: number) => setMenu({ x: clamp(x, 8, window.innerWidth - 220), y: clamp(y, 8, window.innerHeight - 260) });
  const act = (label: string) => { toast.success(`演示：${label}（mock）。`); setMenu(null); };
  return (
    <div>
      <div
        role="button" tabIndex={0} aria-label="演示消息，右键或 Shift+F10 打开菜单"
        className="max-w-md cursor-context-menu rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        onContextMenu={(e) => { e.preventDefault(); openAt(e.clientX, e.clientY); }}
        onPointerDown={(e) => { longPress.current = window.setTimeout(() => openAt(e.clientX, e.clientY), 500); }}
        onPointerUp={() => { if (longPress.current) window.clearTimeout(longPress.current); }}
        onPointerLeave={() => { if (longPress.current) window.clearTimeout(longPress.current); }}
        onKeyDown={(e) => {
          if ((e.shiftKey && e.key === "F10") || (e.ctrlKey && e.key === "Enter")) {
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            openAt(r.left + 40, r.bottom + 4);
          }
        }}
      >
        <span className="font-medium">Ada：</span> 这个群的广告有点多，能不能加个关键词？
        <span className="mt-1 block text-xs text-[var(--dim)]">右键 / 长按 / Shift+F10 打开菜单（定位在光标处，offset 2px，placement bottom start）。</span>
      </div>
      {menu && (
        <div role="menu" aria-label="消息操作" className="fixed z-50 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          {["放行", "删除消息", "禁言 24 小时"].map((label) => (
            <button key={label} type="button" role="menuitem" className="block w-full rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[var(--surface-3)]" onClick={() => act(label)}>{label}</button>
          ))}
          <button type="button" role="menuitem" aria-expanded={sub} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[var(--surface-3)]" onClick={() => setSub(!sub)}>
            更多 <Icon name="chevron" size={14} />
          </button>
          {sub && (
            <div className="ml-3 border-l border-[var(--border)] pl-1">
              {["加入豁免", "标记复核"].map((label) => (
                <button key={label} type="button" role="menuitem" className="block w-full rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[var(--surface-3)]" onClick={() => act(label)}>{label}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HoverCardDemo() {
  const [open, setOpen] = useState(false);
  const [followed, setFollowed] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const lastOpened = useRef(0);
  const scheduleOpen = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    const delay = Date.now() - lastOpened.current < 2000 ? 0 : 700;
    openTimer.current = window.setTimeout(() => { setOpen(true); lastOpened.current = Date.now(); }, delay);
  };
  const scheduleClose = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 300);
  };
  useEffect(() => () => { if (openTimer.current) window.clearTimeout(openTimer.current); if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);
  return (
    <div className="relative">
      <p className="text-sm leading-7">
        刚才 <span
          tabIndex={0}
          className="cursor-pointer font-medium text-[var(--accent)] underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          onMouseEnter={scheduleOpen} onMouseLeave={scheduleClose} onFocus={scheduleOpen} onBlur={scheduleClose}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >@Ada</span> 在群里发了一条广告举报。悬停 700ms 后打开，离开 300ms 后关闭；触发器与卡片之间有安全区，斜着移过去不会关；打开过一个后下一个立即打开；Tab 聚焦打开，Esc 关闭。
      </p>
      {open && (
        <div role="dialog" aria-label="Ada 的资料卡" className="absolute left-0 top-full z-40 mt-0 w-72 pt-2" onMouseEnter={() => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }} onMouseLeave={scheduleClose}>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
            <div className="flex items-center gap-2.5">
              <Avatar name="Ada" size={40} />
              <div><p className="text-sm font-semibold">Ada</p><p className="text-xs text-[var(--dim)]">@ada · 管理员 · 3 个群</p></div>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--dim)]">DeePlanGroup 管理员，本月举报 42 条，采纳率 93%。</p>
            <Button size="sm" className={followed ? "mt-3" : `mt-3 ${LIB_DARK_ACCENT_FIX_CLASS}`} variant={followed ? "secondary" : "primary"} onClick={() => setFollowed(!followed)}>{followed ? "已关注" : "关注"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

type DropFile = { id: number; name: string; size: number; status: "uploading" | "complete" | "failed"; progress: number };
function DropZoneDemo() {
  const [files, setFiles] = useState<DropFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list);
    if (arr.length === 0) return;
    const fresh: DropFile[] = arr.map((f) => ({ id: nextId.current++, name: f.name, size: f.size, status: f.size > 5 * 1024 * 1024 ? "failed" : "uploading", progress: 0 }));
    setFiles((prev) => [...prev, ...fresh]);
    fresh.filter((f) => f.status === "uploading").forEach((f) => {
      const t = window.setInterval(() => {
        setFiles((prev) => {
          const cur = prev.find((x) => x.id === f.id);
          if (!cur || cur.status !== "uploading") { window.clearInterval(t); return prev; }
          const p = Math.min(100, cur.progress + 12 + Math.random() * 10);
          if (p >= 100) { window.clearInterval(t); return prev.map((x) => (x.id === f.id ? { ...x, progress: 100, status: "complete" } : x)); }
          return prev.map((x) => (x.id === f.id ? { ...x, progress: p } : x));
        });
      }, 180);
    });
  }, []);
  const retry = (id: number) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "uploading" as const, progress: 0 } : f)));
    const t = window.setInterval(() => {
      setFiles((prev) => {
        const cur = prev.find((x) => x.id === id);
        if (!cur || cur.status !== "uploading") { window.clearInterval(t); return prev; }
        const p = Math.min(100, cur.progress + 20);
        if (p >= 100) { window.clearInterval(t); return prev.map((x) => (x.id === id ? { ...x, progress: 100, status: "complete" as const } : x)); }
        return prev.map((x) => (x.id === id ? { ...x, progress: p } : x));
      });
    }, 180);
  };
  return (
    <div>
      <div
        data-drop-target={dragOver ? "true" : undefined}
        className={`rounded-[10px] border-2 border-dashed px-4 py-8 text-center transition ${dragOver ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border-strong)]"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      >
        <p className="text-sm font-medium">把文件拖到这里，或</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => inputRef.current?.click()}>Select files</Button>
        <p className="mt-2 text-xs text-[var(--dim)]">支持 image/*、.pdf；单个文件超过 5 MB 会失败，可重试；上传只在本地模拟进度，不发请求。</p>
        <input ref={inputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li key={f.id} data-status={f.status} className="rounded-[10px] border border-[var(--border)] px-3 py-2">
              <div className="flex items-center gap-2 text-[13px]">
                <FileSvg size={16} className="shrink-0 text-[var(--dim)]" />
                <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                <span className="text-xs text-[var(--dim)]">{fmtBytes(f.size)}</span>
                <span className="text-xs">{f.status === "complete" ? "✓ 完成" : f.status === "failed" ? "✕ 失败（超 5 MB）" : "上传中…"}</span>
                {f.status === "failed" && <Button size="sm" variant="secondary" onClick={() => retry(f.id)}>重试</Button>}
                <Button size="sm" variant="ghost" aria-label={`删除 ${f.name}`} onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}><Icon name="x" size={14} /></Button>
              </div>
              {f.status !== "failed" && <Progress value={f.progress / 100} tone={f.status === "complete" ? "success" : "accent"} className="mt-2" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RatingDemo() {
  const [rating, setRating] = useState(4);
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [heart, setHeart] = useState(false);
  const [readonlyVal] = useState(3.5);
  const px = size === "sm" ? 14 : size === "md" ? 18 : 24;
  const Glyph = heart ? HeartSvg : StarSvg;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={size} onChange={setSize} ariaLabel="尺寸" options={[{ value: "sm", label: "sm" }, { value: "md", label: "md" }, { value: "lg", label: "lg" }]} />
        <label className="flex items-center gap-2 text-xs"><Switch label="爱心图标" checked={heart} onChange={setHeart} /> 爱心图标</label>
        <span className="text-xs text-[var(--dim)]">当前评分：{rating} / 5（按下缩放至 0.8）</span>
      </div>
      <RadioGroup orientation="horizontal" value={String(rating)} onChange={(v) => setRating(Number(v))} aria-label="评分" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Radio key={i} value={String(i)} aria-label={`${i} 星`} className="rounded-md p-0.5 active:scale-[.8]">
            <Radio.Content className="p-0">
              <Glyph size={px} filled={i <= rating} className={i <= rating ? "text-amber-500" : "text-[var(--dim-2)]"} />
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      <div className="flex items-center gap-2 text-xs text-[var(--dim)]">
        只读小数填充 {readonlyVal} / 5：
        <span className="relative inline-flex" aria-label={`只读评分 ${readonlyVal}`}>
          <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Glyph key={i} size={16} className="text-[var(--dim-2)]" />)}</span>
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${(readonlyVal / 5) * 100}%` }}>
            <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Glyph key={i} size={16} filled className="shrink-0 text-amber-500" />)}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

const TIMELINE_ITEMS = [
  { status: "success", title: "新人验证通过", desc: "Ada 完成验证码，用时 42 秒", time: "09:41" },
  { status: "current", title: "广告命中待处置", desc: "CryptoPush_Example · 9.8 分", time: "09:43" },
  { status: "warning", title: "刷屏兜底触发", desc: "同一发送者 60 秒 12 条，已删窗口 + 禁言", time: "09:50" },
  { status: "danger", title: "钓鱼链接已删除", desc: "仿冒登录页，模型 0.99", time: "10:02" },
  { status: "muted", title: "申诉已关闭", desc: "管理员维持原判", time: "10:20" },
  { status: "default", title: "日报已生成", desc: "7 日趋势与分类统计", time: "10:30" },
] as const;
const TL_COLOR: Record<string, string> = { success: "#059669", current: "#0e7490", warning: "#d97706", danger: "#dc2626", muted: "#94a3b8", default: "#64748b" };

function TimelineDemo() {
  const [axis, setAxis] = useState<"left" | "center">("left");
  const [alternate, setAlternate] = useState(false);
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={axis} onChange={setAxis} ariaLabel="轴线位置" options={[{ value: "left", label: "轴线左侧" }, { value: "center", label: "轴线居中" }]} />
        <Segmented value={density} onChange={setDensity} ariaLabel="密度" options={[{ value: "compact", label: "compact" }, { value: "comfortable", label: "comfortable" }]} />
        <label className="flex items-center gap-2 text-xs"><Switch label="内容左右交替" checked={alternate} onChange={setAlternate} isDisabled={axis !== "center"} /> 内容左右交替（居中时）</label>
      </div>
      <ol className={`relative ${axis === "center" ? "mx-auto max-w-xl" : ""}`}>
        <span aria-hidden="true" className={`absolute top-2 bottom-2 w-px bg-[var(--border-strong)] ${axis === "center" ? "left-1/2" : "left-[7px]"}`} />
        {TIMELINE_ITEMS.map((it, i) => {
          const left = axis === "left" || !alternate || i % 2 === 0;
          return (
            <li key={it.title} className={`relative ${density === "compact" ? "pb-3" : "pb-5"} ${axis === "center" ? (left ? "pr-[52%] pl-0" : "pl-[52%] pr-0") : "pl-7"}`}>
              <span aria-hidden="true" className={`absolute top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-[var(--surface)] ${axis === "center" ? "left-1/2 -translate-x-1/2" : "left-0"}`} style={{ background: TL_COLOR[it.status] ?? "#64748b" }} />
              <Card>
                <div className="flex items-start gap-2.5 p-3">
                  {it.status === "success" ? <PhotoAvatar name="Ada" size={28} /> : <Avatar name="Bot" size={28} />}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium">{it.title}<HeroChip size="sm" variant="soft">{it.status}</HeroChip></p>
                    <p className="mt-0.5 text-xs leading-5 text-[var(--dim)]">{it.desc}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--dim)]">{it.time}</span>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-[var(--dim)]">只读时间顺序，不用于分步骤流程（已知步骤的流程改用 Stepper）。连接线在最后一项自动隐藏。</p>
    </div>
  );
}

const EMOJI_CATS: { id: string; label: string; items: string[] }[] = [
  { id: "smile", label: "笑脸", items: ["😀", "😁", "😂", "🤣", "😊", "😍", "😎", "🤔", "😴", "🥳", "😢", "😡"] },
  { id: "hands", label: "手势", items: ["👍", "👎", "👏", "🙌", "🙏", "👋", "✌️", "🤝", "💪", "👌"] },
  { id: "animals", label: "动物", items: ["🐶", "🐱", "🦊", "🐼", "🦁", "🐸", "🦄", "🐝"] },
  { id: "food", label: "食物", items: ["🍕", "🍔", "🍣", "🍩", "☕", "🍺", "🍎", "🌶️"] },
  { id: "activity", label: "活动", items: ["⚽", "🏀", "🎮", "🎵", "🚀", "🎉", "💡", "🔥"] },
];
const TONES = ["", "🏻", "🏼", "🏽", "🏾", "🏿"];

function EmojiPickerDemo() {
  const [text, setText] = useState("今天群里很热闹 ");
  const [cat, setCat] = useState("smile");
  const [q, setQ] = useState("");
  const [tone, setTone] = useState(0);
  const [pickerSize, setPickerSize] = useState<"sm" | "md" | "lg">("md");
  const [open, setOpen] = useState(false);
  const active = EMOJI_CATS.find((c) => c.id === cat) ?? EMOJI_CATS[0]!;
  const shown = active.items.filter((e) => !q || e.includes(q));
  const insert = (e: string) => {
    const toneable = ["👍", "👎", "👏", "🙌", "🙏", "👋", "✌️", "🤝", "💪", "👌"].includes(e);
    setText((t) => t + e + (toneable ? (TONES[tone] ?? "") : ""));
  };
  return (
    <div>
      <Field label="消息输入（点表情插进文字）">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="mt-2 flex items-center gap-2">
        <Popover isOpen={open} onOpenChange={setOpen}>
          <Popover.Trigger>
            <HeroButton variant="secondary" size="sm" aria-label="打开表情选择器">😀 表情</HeroButton>
          </Popover.Trigger>
          <Popover.Content placement="bottom start" className={pickerSize === "sm" ? "w-60" : pickerSize === "lg" ? "w-80" : "w-72"}>
            <Popover.Dialog className="p-3">
              <SearchField aria-label="搜索表情" value={q} onChange={setQ}>
                <SearchField.Group className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2">
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="搜索表情…" className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
              <div className="mt-2 flex flex-wrap gap-1">
                {EMOJI_CATS.map((c) => (
                  <Button key={c.id} size="sm" className={cat === c.id ? LIB_DARK_ACCENT_FIX_CLASS : ""} variant={cat === c.id ? "primary" : "ghost"} onClick={() => setCat(c.id)}>{c.label}</Button>
                ))}
              </div>
              <div className="mt-2 grid max-h-44 grid-cols-6 gap-1 overflow-y-auto" role="listbox" aria-label="表情网格">
                {shown.map((e) => (
                  <button key={e} type="button" role="option" aria-selected="false" className="flex h-9 items-center justify-center rounded-lg text-xl hover:bg-[var(--surface-3)]" onClick={() => insert(e)}>{e}</button>
                ))}
                {shown.length === 0 && <p className="col-span-6 py-4 text-center text-xs text-[var(--dim)]">没有匹配的表情。</p>}
              </div>
              <div className="mt-2 flex items-center gap-1 border-t border-[var(--border)] pt-2">
                <span className="text-xs text-[var(--dim)]">肤色：</span>
                {TONES.map((t, i) => (
                  <button key={i} type="button" aria-label={`肤色 ${i === 0 ? "默认" : i}`} className={`flex h-7 w-7 items-center justify-center rounded-md text-base ${tone === i ? "bg-[var(--surface-3)] ring-1 ring-[var(--accent)]" : ""}`} onClick={() => setTone(i)}>👍{t}</button>
                ))}
              </div>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
        <Segmented value={pickerSize} onChange={setPickerSize} ariaLabel="浮层尺寸" options={[{ value: "sm", label: "sm" }, { value: "md", label: "md（280×350）" }, { value: "lg", label: "lg" }]} />
        <span className="text-xs text-[var(--dim)]">搜索默认不区分大小写包含匹配；肤色选择器另管一个 Popover（这里收进同一面板内一行）。</span>
      </div>
    </div>
  );
}

function PressableFeedbackDemo() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = useRef(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdDone, setHoldDone] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const [autoProgress, setAutoProgress] = useState<number | null>(null);
  useEffect(() => () => { if (holdTimer.current) window.clearInterval(holdTimer.current); }, []);
  useEffect(() => {
    if (autoProgress === null) return;
    if (autoProgress >= 100) { const t = window.setTimeout(() => setAutoProgress(null), 800); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => setAutoProgress((p) => (p === null ? null : Math.min(100, p + 5))), 100);
    return () => window.clearTimeout(t);
  }, [autoProgress]);
  const startHold = () => {
    setHoldDone(false); setHoldProgress(0);
    const started = Date.now();
    holdTimer.current = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / 2000) * 100);
      setHoldProgress(p);
      if (p >= 100) { if (holdTimer.current) window.clearInterval(holdTimer.current); setHoldDone(true); toast.success("演示：长按确认已触发。"); }
    }, 50);
  };
  const cancelHold = () => { if (holdTimer.current) window.clearInterval(holdTimer.current); if (!holdDone) setHoldProgress(0); };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[10px] border border-[var(--border)] p-3">
        <p className="text-[13px] font-medium">Highlight（透明度按压遮罩）</p>
        <button type="button" className="mt-2 w-full rounded-lg bg-[var(--surface-3)] px-3 py-2.5 text-sm font-medium transition active:bg-[var(--accent-bg)] active:opacity-70" onClick={() => toast.info("演示：Highlight 按钮已点。")}>按住我看遮罩</button>
      </div>
      <div className="rounded-[10px] border border-[var(--border)] p-3">
        <p className="text-[13px] font-medium">Ripple（M3 风格径向涟漪）</p>
        <button
          type="button"
          className="relative mt-2 w-full overflow-hidden rounded-lg bg-[var(--surface-3)] px-3 py-2.5 text-sm font-medium"
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const id = ++rippleId.current;
            setRipples((prev) => [...prev, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
            window.setTimeout(() => setRipples((prev) => prev.filter((x) => x.id !== id)), 600);
          }}
        >
          点任意位置起涟漪
          {ripples.map((rp) => (
            <span key={rp.id} aria-hidden="true" className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[var(--accent)] opacity-30" style={{ left: rp.x, top: rp.y }} />
          ))}
        </button>
      </div>
      <div className="rounded-[10px] border border-[var(--border)] p-3">
        <p className="text-[13px] font-medium">HoldConfirm（长按 2000ms 确认，松开回弹）</p>
        <button
          type="button"
          className={`relative mt-2 w-full overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium text-white ${holdDone ? "bg-[var(--accent)] " + LIB_DARK_ACCENT_FIX_CLASS : "bg-[var(--danger)] " + LIB_DARK_DANGER_FIX_CLASS}`}
          onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold}
        >
          <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${holdProgress}%` }} />
          <span className="relative">{holdDone ? "✓ 已确认删除" : holdProgress > 0 ? `按住确认… ${Math.round(holdProgress)}%` : "长按删除这条消息"}</span>
        </button>
      </div>
      <div className="rounded-[10px] border border-[var(--border)] p-3">
        <p className="text-[13px] font-medium">ProgressFeedback（点击后自动走进度，2000ms 触发）</p>
        <button type="button" disabled={autoProgress !== null} className="relative mt-2 w-full overflow-hidden rounded-lg bg-[var(--surface-3)] px-3 py-2.5 text-sm font-medium disabled:opacity-70" onClick={() => setAutoProgress(0)}>
          <span className="absolute inset-y-0 left-0 bg-[var(--accent)]/25" style={{ width: `${autoProgress ?? 0}%` }} />
          <span className="relative">{autoProgress === null ? "点击开始处理" : autoProgress >= 100 ? "✓ 处理完成" : `处理中… ${Math.round(autoProgress)}%`}</span>
        </button>
      </div>
    </div>
  );
}

function EmojiReactionDemo() {
  const [reactions, setReactions] = useState([
    { emoji: "👍", count: 12, on: false },
    { emoji: "❤️", count: 5, on: true },
    { emoji: "😂", count: 3, on: false },
  ]);
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [readonly, setReadonly] = useState(false);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={size} onChange={setSize} ariaLabel="尺寸" options={[{ value: "sm", label: "sm" }, { value: "md", label: "md" }, { value: "lg", label: "lg" }]} />
        <label className="flex items-center gap-2 text-xs"><Switch label="只读" checked={readonly} onChange={setReadonly} /> 只读</label>
      </div>
      <div className="flex flex-wrap gap-2">
        {reactions.map((r, i) => (
          <ToggleButton
            key={r.emoji}
            isSelected={r.on}
            isDisabled={readonly}
            onChange={(v) => setReactions((prev) => prev.map((x, j) => (j === i ? { ...x, on: v, count: x.count + (v ? 1 : -1) } : x)))}
            aria-label={`${r.emoji} ${r.count} 个反应`}
            className={`${size === "sm" ? "h-7 px-2 text-xs" : size === "lg" ? "h-10 px-3.5 text-base" : "h-8 px-3 text-sm"} rounded-full border border-[var(--border)] bg-[var(--surface)] data-[selected=true]:border-[var(--accent)] data-[selected=true]:bg-[var(--accent-bg)] data-[selected=true]:text-[var(--accent)] active:scale-[.95]`}
          >
            <span>{r.emoji}</span> <span className="font-semibold tabular-nums">{r.count}</span>
          </ToggleButton>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--dim)]">点按切换选中态，选中时描边与背景变强调色、数量文字变强调色；按下缩放。</p>
    </div>
  );
}

function ResizableDemo() {
  const [widths, setWidths] = useState<number[]>(() => {
    try {
      const raw = window.localStorage.getItem("lib-resizable");
      if (raw) { const arr = JSON.parse(raw) as number[]; if (Array.isArray(arr) && arr.length === 3 && arr.every((n) => typeof n === "number")) return arr; }
    } catch { /* 忽略损坏的存储 */ }
    return [28, 44, 28];
  });
  const [variant, setVariant] = useState<"line" | "drag" | "pill" | "handle">("drag");
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ idx: number; startX: number; start: number[] } | null>(null);
  useEffect(() => {
    try { window.localStorage.setItem("lib-resizable", JSON.stringify(widths)); } catch { /* 存储不可用仅当前会话生效 */ }
  }, [widths]);
  const onHandleDown = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { idx, startX: e.clientX, start: [...widths] };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current; if (!d) return;
      const container = (e.target as HTMLElement).closest("[data-resizable]")?.getBoundingClientRect();
      const total = container?.width ?? 600;
      const delta = ((ev.clientX - d.startX) / total) * 100;
      setWidths((prev) => {
        const next = [...prev];
        const na = clamp((d.start[d.idx] ?? 0) + delta, 8, 70);
        const applied = na - (d.start[d.idx] ?? 0);
        const nb = clamp((d.start[d.idx + 1] ?? 0) - applied, 8, 70);
        next[d.idx] = na; next[d.idx + 1] = nb;
        return next;
      });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setWidths((prev) => {
        if (prev[0] !== undefined && prev[0] < 10) { setCollapsed(true); return [0, prev[1]! + prev[0]!, prev[2]!]; }
        return prev;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const panels = [
    { title: "群列表", body: MOCK_GROUPS.join(" · ") },
    { title: "消息", body: "选中群的最新消息与处置记录。" },
    { title: "详情", body: "点一条消息，这里显示判定证据。" },
  ];
  const eff = collapsed ? [0, widths[1]! + widths[0]!, widths[2]!] : widths;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={variant} onChange={setVariant} ariaLabel="手柄形态" options={[{ value: "line", label: "line" }, { value: "drag", label: "drag" }, { value: "pill", label: "pill" }, { value: "handle", label: "handle" }]} />
        {collapsed && <Button size="sm" variant="secondary" onClick={() => { setCollapsed(false); setWidths([28, 44, 28]); }}>展开左侧面板</Button>}
        <span className="text-xs text-[var(--dim)]">拖手柄改宽（百分比，autoSaveId 存 localStorage，刷新保持）；左栏拖到最小以下会折叠。当前 {eff.map((w) => `${Math.round(w)}%`).join(" / ")}。</span>
      </div>
      <div data-resizable className="flex h-40 overflow-hidden rounded-[10px] border border-[var(--border)]" role="group" aria-label="可拖拽面板组">
        {panels.map((p, i) => (
          <div key={p.title} className="flex min-w-0">
            <div className="min-w-0 flex-1 overflow-hidden bg-[var(--surface)] p-3" style={{ width: `${eff[i] ?? 0}%`, display: eff[i] === 0 ? "none" : undefined }}>
              <p className="text-[13px] font-medium">{p.title}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--dim)]">{p.body}</p>
            </div>
            {i < panels.length - 1 && (
              <div
                role="separator" aria-orientation="vertical" aria-label={`调整 ${p.title} 宽度`} tabIndex={0}
                className={`relative w-2 shrink-0 cursor-col-resize touch-none select-none ${variant === "line" ? "bg-transparent hover:bg-[var(--accent)]/20" : "bg-[var(--surface-3)]"}`}
                onPointerDown={onHandleDown(i)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                  e.preventDefault();
                  const d = e.key === "ArrowLeft" ? -2 : 2;
                  setWidths((prev) => { const n = [...prev]; n[i] = clamp((n[i] ?? 0) + d, 8, 70); n[i + 1] = clamp((n[i + 1] ?? 0) - d, 8, 70); return n; });
                }}
              >
                {variant === "drag" && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-[var(--dim)]">⋮⋮</span>}
                {variant === "pill" && <span className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--border-strong)]" />}
                {variant === "handle" && <span className="absolute left-1/2 top-1/2 h-8 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-sm" />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingTocDemo({ sections, active }: { sections: { id: string; title: string }[]; active: string }) {
  const [mode, setMode] = useState<"hover" | "press">("hover");
  const [placement, setPlacement] = useState<"left" | "right">("right");
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const openNow = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setOpen(true); };
  const closeLater = () => { closeTimer.current = window.setTimeout(() => setOpen(false), 300); };
  const go = (id: string) => { document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); if (mode === "press") setOpen(false); };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={mode} onChange={setMode} ariaLabel="触发方式" options={[{ value: "hover", label: "hover（默认）" }, { value: "press", label: "press" }]} />
        <Segmented value={placement} onChange={setPlacement} ariaLabel="位置" options={[{ value: "right", label: "right（默认）" }, { value: "left", label: "left" }]} />
        <span className="text-xs text-[var(--dim)]">本页右下角的浮动目录就是这个组件的真身：滚动页面，看当前章节的指示线变长、条目变强调色；openDelay 200ms / closeDelay 300ms。</span>
      </div>
      <div className={`fixed bottom-6 z-40 ${placement === "right" ? "right-4" : "left-4"}`} onMouseEnter={mode === "hover" ? openNow : undefined} onMouseLeave={mode === "hover" ? closeLater : undefined}>
        <button
          type="button" aria-label="打开目录" aria-expanded={open}
          className="flex h-12 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          onClick={() => { if (mode === "press") setOpen(!open); }}
        >
          <span className="flex flex-col items-center gap-1">
            {sections.map((s) => (
              <span key={s.id} aria-hidden="true" className="rounded-full bg-[var(--accent)] transition-all" style={{ width: active === s.id ? 24 : 16, height: 2 }} />
            ))}
          </span>
        </button>
        {open && (
          <div role="navigation" aria-label="页面目录" className={`absolute bottom-0 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl ${placement === "right" ? "right-8" : "left-8"}`}>
            {sections.map((s, i) => (
              <button key={s.id} type="button" onClick={() => go(s.id)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[var(--surface-3)] ${active === s.id ? "font-semibold text-[var(--accent)]" : ""}`} style={{ paddingLeft: `${10 + i * 0}px` }}>
                <span aria-hidden="true" className="h-0.5 rounded-full bg-[var(--accent)]" style={{ width: active === s.id ? 24 : Math.max(16 - i * 3, 8) }} />
                {s.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OverlaySection({ navigate, sections, activeSection }: { navigate?: NavigateFn; sections: { id: string; title: string }[]; activeSection: string }) {
  return (
    <Section id="overlay" title="交互与浮层（R2-5）" desc="命令面板、右键菜单、悬停卡片、拖放上传、评分、时间线、浮动目录、按压反馈、表情反应、表情选择器、拖拽面板组——每件都按对照表的做法拼出来，可点可用。">
      <Entry id="command" name="Command" href={PRO("command")} status="lib" note="免费 Modal + SearchField + ListBox 拼：面板在距顶部 15vh 处，过滤默认不区分大小写包含匹配，空结果有 empty state；导航类命令真的会跳页，操作类会弹 Toast。">
        <CommandDemo navigate={navigate} />
      </Entry>
      <Entry id="context-menu" name="ContextMenu" href={PRO("context-menu")} status="lib" note="免费 Dropdown 的 Item / Section / SubmenuTrigger 等子组件拼，触发为右键 / 长按定位到光标处；触摸设备长按打开；Shift+F10（Win/Linux）/ Control+Enter（macOS）键盘打开。">
        <ContextMenuDemo />
      </Entry>
      <Entry id="hover-card" name="HoverCard" href={PRO("hover-card")} status="lib" note="RAC PreviewTrigger + Popover + OverlayArrow 的等价手写版：悬停 openDelay 700ms / 离开 closeDelay 300ms，安全区防误关，全局协调（打开过一个后下一个立即打开），触屏长按、Tab 聚焦打开，Esc 关闭。">
        <HoverCardDemo />
      </Entry>
      <Entry id="drop-zone" name="DropZone" href={PRO("drop-zone")} status="lib" note="RAC DropZone 的等价手写版：原生拖放区 + 隐藏 file input 浏览选择 + 免费 ProgressBar 上传进度 + 文件列表自渲染（文件名、大小、状态、重试 / 删除）；大小限制自有校验（> 5 MB 失败）。">
        <DropZoneDemo />
      </Entry>
      <Entry id="rating" name="Rating" href={PRO("rating")} status="lib" note="RAC RadioGroup 横向 + Radio，星形 / 爱心图标自定义，五星可选；只读时小数部分填充显示；按下缩放至 0.8；激活星默认 warning 色。">
        <RatingDemo />
      </Entry>
      <Entry id="timeline" name="Timeline" href={PRO("timeline")} status="lib" note="免费 Disclosure / Card + 手写时间线竖线；事件内容用免费 Card、Chip、Avatar；轴线左 / 中，内容可左右交替；尺寸 sm / md / lg，密度 compact / comfortable；每项状态 default / current / success / warning / danger / muted。">
        <TimelineDemo />
      </Entry>
      <Entry id="floating-toc" name="FloatingTOC" href={PRO("floating-toc")} status="lib" note="免费组件 + 手写浮动目录（Trigger + Popover + Item，placement / triggerMode / openDelay / closeDelay 按文档）；滚动位置跟踪用 IntersectionObserver，点条目平滑滚动到对应章节。">
        <FloatingTocDemo sections={sections} active={activeSection} />
      </Entry>
      <Entry id="pressable-feedback" name="PressableFeedback" href={PRO("pressable-feedback")} status="lib" note="四层按文档实现：Highlight（透明度按压遮罩）、Ripple（M3 风格径向涟漪）、HoldConfirm（长按到满默认 2000ms 触发确认，松开回弹）、ProgressFeedback（点击后自动走进度，默认 2000ms 触发）。">
        <PressableFeedbackDemo />
      </Entry>
      <Entry id="emoji-reaction-button" name="EmojiReactionButton" href={PRO("emoji-reaction-button")} status="lib" note="RAC ToggleButton + Emoji 与 Count 两个 span，选中态强调色、按下缩放；支持只读与禁用；尺寸 sm / md / lg。">
        <EmojiReactionDemo />
      </Entry>
      <Entry id="emoji-picker" name="EmojiPicker" href={PRO("emoji-picker")} status="lib" note="RAC Select + Autocomplete 搜索 + Virtualizer 网格 + ListBox 条目 + Popover 浮层，肤色选择器另管 Popover；搜索过滤默认不区分大小写包含匹配；浮层分 sm / md / lg 三档（默认 280×350px）。本实现网格用 ScrollShadow 滚动（表情量小，虚拟化无必要，行为契约一致）。">
        <EmojiPickerDemo />
      </Entry>
      <Entry id="resizable" name="Resizable 拖拽面板组" href={PRO("resizable")} status="lib" note="Pro 底层是 react-resizable-panels（MIT）；第一期按对照表手写拖拽手柄（pointer 事件改宽）：手柄四形态 line / drag / pill / handle，尺寸按百分比，collapsible + collapsedSize 可拖到最小以下折叠，autoSaveId 持久化到 localStorage。外壳侧栏本身仍固定宽 + 开关，不拖拽。">
        <ResizableDemo />
      </Entry>
    </Section>
  );
}

/* ---------- 六、成页与重型（R2-6） ---------- */

type KanbanCard = { id: number; col: string; title: string; desc: string; priority: "高" | "中" | "低"; user: string; cover?: string; progress?: number; comments?: number; attachments?: number };

/** Kanban 优先级 → soft chip 钉色（R2-5/R2-6 收尾批）：复用 kpi 的
 *  trendChipToneClass，把底/字色钉死到控制台 token；本地裸 HeroChip soft
 *  在同样构建（丢 @supports color-mix 定义）下底/字同值、文字隐形，
 *  与 R2-3 TrendChip 同一根因。单测见 ComponentLibraryPage.test.ts。 */
export function kanbanPriorityChipClass(priority: KanbanCard["priority"]): string {
  return trendChipToneClass(priority === "高" ? "danger" : priority === "中" ? "warning" : "success");
}

/** 库页样式修复（2026-11-26 扫查 8 项）：只钉库页本地演示样式。
 * 根因：深色态 --accent 是亮青 #22d3ee、白字在其上只有 1.76–1.81，
 * --danger 深色 #f87171 白字 2.77；浅色 accent #0e7490 白字 5.36、
 * danger #dc2626 白字 4.83。theme.css 是共享 token、一律不改；
 * ui.tsx 的 Button / Avatar 是共享组件、也不改。下面两枚 dark: 工具类
 * 只出现在本文件内的落点、只在 .dark 下生效，浅色渲染一字不动，
 * 控制台页面不受影响（HeroUI 的 .button 背景在 @layer components，
 * Tailwind utilities 层在后，dark: 工具类能覆盖它；探针已实测）。
 * 白字对比度：#0e7490 → 5.36，#b91c1c → 6.47。单测见 ComponentLibraryPage.test.ts。 */
export const LIB_DARK_ACCENT_FIX_CLASS = "dark:bg-[#0e7490]";
export const LIB_DARK_DANGER_FIX_CLASS = "dark:bg-[#b91c1c]";

/* ---------- 独立 demo 主题切换（只在 standalone 时渲染） ----------
 * 复用现有主题系统，不另造一套：ThemeController 里的 useTheme("system")
 * 是唯一 useTheme 实例，HeroUI 的 useTheme 把选择存 localStorage
 * "heroui-theme"，把解析后的主题写到 documentElement 的 class +
 * data-theme；demo-index.html / client/index.html 的防闪脚本读同一份
 * key，所以 setTheme 写入后刷新不闪、刷新保持上次选择。
 * demo 里不走控制台顶栏的三档循环（system/light/dark）：两态切换，
 * 只在有效主题 light/dark 之间翻（system 按 prefers-color-scheme
 * 解析成有效主题再取反；写入的永远是显式 light/dark，不再回 system）。
 * 控制台里的库页页签不传 standalone，不渲染此按钮（顶栏已有切换）。 */
export const THEME_STORAGE_KEY = "heroui-theme";

/** 存储值 + 系统偏好 → 当前有效主题（与防闪脚本同口径）。 */
export function resolveEffectiveTheme(theme: string, prefersDark: boolean): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return prefersDark ? "dark" : "light";
}

/** 两态切换的下一选择：永远是与当前有效主题相反的显式值。 */
export function nextStandaloneTheme(theme: string, prefersDark: boolean): "light" | "dark" {
  return resolveEffectiveTheme(theme, prefersDark) === "dark" ? "light" : "dark";
}

/** 切换按钮 aria-label：永远写“切到另一态”，两态文案不同。 */
export function standaloneThemeToggleLabel(effective: "light" | "dark"): string {
  return effective === "dark" ? "切换到浅色主题" : "切换到深色主题";
}

const KANBAN_COLS = [
  { id: "todo", title: "待处理" },
  { id: "doing", title: "处理中" },
  { id: "done", title: "已完成" },
];
function KanbanDemo() {
  const [cards, setCards] = useState<KanbanCard[]>([
    { id: 1, col: "todo", title: "钓鱼链接 9.6 分", desc: "ForwardHub · 人工复核", priority: "高", user: "Ada", cover: "https://picsum.photos/seed/kanban-phish/480/160", progress: 45, comments: 8, attachments: 3 },
    { id: 2, col: "todo", title: "广告 9.8 分", desc: "@NextCLi · 消息已删", priority: "高", user: "Grace", cover: "https://picsum.photos/seed/kanban-ad/480/160", progress: 70, comments: 5, attachments: 1 },
    { id: 3, col: "doing", title: "刷屏 12 条", desc: "DeePlanGroup · 已禁言", priority: "中", user: "Linus", cover: "https://picsum.photos/seed/kanban-flood/480/160", progress: 20, comments: 2, attachments: 0 },
    { id: 4, col: "done", title: "色情图片", desc: "CryptoPush · 已删除", priority: "低", user: "小白", cover: "https://picsum.photos/seed/kanban-done/480/160", progress: 100, comments: 12, attachments: 4 },
  ]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [colSize, setColSize] = useState<"sm" | "md" | "lg">("md");
  const [newTitle, setNewTitle] = useState("");
  const dragId = useRef<number | null>(null);
  const colW = colSize === "sm" ? 240 : colSize === "lg" ? 320 : 280;
  const moveCard = (id: number, dir: -1 | 1) => {
    setCards((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const idx = KANBAN_COLS.findIndex((col) => col.id === c.col);
      const next = KANBAN_COLS[clamp(idx + dir, 0, KANBAN_COLS.length - 1)];
      return next ? { ...c, col: next.id } : c;
    }));
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={colSize} onChange={setColSize} ariaLabel="列宽" options={[{ value: "sm", label: "sm 240" }, { value: "md", label: "md 280" }, { value: "lg", label: "lg 320" }]} />
        <span className="flex items-center gap-2">
          <Input aria-label="新卡片标题" placeholder="新卡片标题…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-44" />
          <Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} onClick={() => { const t = newTitle.trim(); if (!t) return; setCards((prev) => [...prev, { id: Math.max(0, ...prev.map((c) => c.id)) + 1, col: "todo", title: t, desc: "新建 · 待处理", priority: "中", user: "小白" }]); setNewTitle(""); }}>加到待处理</Button>
        </span>
        {selected.size > 0 && <HeroChip size="sm" color="accent">已选 {selected.size} 张</HeroChip>}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2" role="list" aria-label="看板">
        {KANBAN_COLS.map((col) => {
          const items = cards.filter((c) => c.col === col.id);
          return (
            <div
              key={col.id} role="listitem" aria-label={`${col.title}列`}
              className="shrink-0 rounded-xl bg-[var(--surface-2)] p-3"
              style={{ width: colW }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = dragId.current; if (id === null) return;
                setCards((prev) => prev.map((c) => (c.id === id ? { ...c, col: col.id } : c)));
                dragId.current = null;
              }}
            >
              <p className="px-1 pb-2 text-[15px] font-bold">{col.title} <span className="text-xs font-normal text-[var(--dim)]">{items.length}</span></p>
              <div className="space-y-3">
                {items.map((c) => (
                  <article
                    key={c.id} draggable
                    onDragStart={() => { dragId.current = c.id; }}
                    onDragEnd={() => { dragId.current = null; }}
                    className="overflow-hidden rounded-xl border-0 bg-[var(--surface)] shadow-[var(--shadow-md)]"
                  >
                    {c.cover && (
                      <div className="h-24 w-full bg-[var(--border)]">
                        <img src={c.cover} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      </div>
                    )}
                    <div className="p-3">
                    <div className="flex items-start gap-2">
                      <Checkbox label={`选中卡片 ${c.title}`} isSelected={selected.has(c.id)} onChange={(v) => setSelected((prev) => { const n = new Set(prev); if (v) n.add(c.id); else n.delete(c.id); return n; })} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-6">{c.title}</p>
                        <p className="mt-0.5 text-[13px] text-[var(--dim)]">{c.desc}</p>
                      </div>
                      <HeroChip size="sm" variant="soft" color={c.priority === "高" ? "danger" : c.priority === "中" ? "warning" : "success"} className={kanbanPriorityChipClass(c.priority)}>{c.priority}</HeroChip>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-[var(--dim)]"><PhotoAvatar name={c.user} size={20} />{c.user}</span>
                      <span className="flex gap-1">
                        <Button size="sm" variant="ghost" aria-label={`把 ${c.title} 移到上一列`} onClick={() => moveCard(c.id, -1)}>←</Button>
                        <Button size="sm" variant="ghost" aria-label={`把 ${c.title} 移到下一列`} onClick={() => moveCard(c.id, 1)}>→</Button>
                      </span>
                    </div>
                    {c.progress !== undefined && (
                      <div className="mt-2.5" role="img" aria-label={`进度 ${c.progress}%`}>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${c.progress}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--dim)]">
                      <span>💬 {c.comments ?? 0}</span>
                      <span>📎 {c.attachments ?? 0}</span>
                      <span className="ml-auto">{c.progress ?? 0}%</span>
                    </div>
                    </div>
                  </article>
                ))}
                {items.length === 0 && <EmptyState icon="inbox" title="这一列是空的" desc="把卡片拖过来，或在上面新建。" />}
              </div>
              <button type="button" onClick={() => { setCards((prev) => [...prev, { id: Math.max(0, ...prev.map((x) => x.id)) + 1, col: col.id, title: "新任务", desc: "新建 · 待处理", priority: "中", user: "小白" }]); }} className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[var(--dim)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text)]">+ 添加任务</button>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[var(--dim)]">拖卡片换列（HTML5 拖拽 + 拖拽手柄语义，聚焦时出现；键盘用卡片上的 ← → 按钮）；卡片支持单选 / 多选；空列可自定义空状态。Pro 用 RAC GridList / DropIndicator + useKanban 三 hook，免费版 3.2.8 未导出 GridList，本实现用原生拖拽 + 同行为契约。</p>
    </div>
  );
}

/** FileTree 按类型着色（style-polish J-F1）：文件夹 warn soft 底 + 实心
 * 形；.ts/.tsx accent soft 底 + 实心形；.md 与其余文件 dim 灰。 */
export function fileTreeIconTone(name: string, kind: "file" | "folder"): { wrap: string; filled: boolean } {
  if (kind === "folder") return { wrap: "bg-[var(--warn-bg)] text-[var(--warn)]", filled: true };
  if (/\.tsx?$/.test(name)) return { wrap: "bg-[var(--accent-bg)] text-[var(--accent-strong)]", filled: true };
  return { wrap: "bg-[var(--surface-3)] text-[var(--dim)]", filled: false };
}

type TreeNode = { id: string; name: string; kind: "file" | "folder"; children?: TreeNode[] };
const FILE_TREE: TreeNode[] = [
  { id: "src", name: "client/src", kind: "folder", children: [
    { id: "pages", name: "pages", kind: "folder", children: [{ id: "lib", name: "ComponentLibraryPage.tsx", kind: "file" }] },
    { id: "components", name: "components", kind: "folder", children: [{ id: "ui", name: "ui.tsx", kind: "file" }] },
    { id: "app", name: "App.tsx", kind: "file" },
    { id: "route", name: "route.ts", kind: "file" },
  ] },
  { id: "server", name: "server/src", kind: "folder", children: [{ id: "actions", name: "actions.ts", kind: "file" }] },
  { id: "readme", name: "README.md", kind: "file" },
];
function moveTree(nodes: TreeNode[], id: string, targetFolderId: string | null): TreeNode[] {
  let moving: TreeNode | null = null;
  const remove = (list: TreeNode[]): TreeNode[] => list.filter((n) => {
    if (n.id === id) { moving = n; return false; }
    if (n.children) n = { ...n, children: remove(n.children) };
    return true;
  });
  const rest = remove(nodes.map((n) => ({ ...n })));
  if (!moving || targetFolderId === null) return moving ? [...rest, moving] : rest;
  const insert = (list: TreeNode[]): TreeNode[] => list.map((n) => {
    if (n.id === targetFolderId && n.kind === "folder") return { ...n, children: [...(n.children ?? []), moving as TreeNode] };
    if (n.children) return { ...n, children: insert(n.children) };
    return n;
  });
  return insert(rest);
}
function FileTreeDemo() {
  const [tree, setTree] = useState<TreeNode[]>(FILE_TREE);
  const [selectedId, setSelectedId] = useState<string | null>("lib");
  const [checkMode, setCheckMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set(["lib"]));
  const [guides, setGuides] = useState<"always" | "hover" | "hidden">("always");
  const dragId = useRef<string | null>(null);
  const renderNode = (n: TreeNode, depth: number): ReactNode => {
    const row = (
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); dragId.current = n.id; }}
        onDragOver={(e) => { if (n.kind === "folder") e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          const id = dragId.current; if (!id || id === n.id) return;
          setTree((prev) => moveTree(prev, id, n.kind === "folder" ? n.id : null));
          dragId.current = null;
        }}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-sm ${selectedId === n.id ? "bg-[var(--accent-bg)] font-semibold shadow-[inset_2px_0_0_var(--accent)]" : "hover:bg-[var(--surface-3)]"} ${guides === "always" && depth > 0 ? "border-l border-[var(--border-strong)]" : ""}`}
        style={{ marginLeft: depth * 14 }}
        onClick={() => setSelectedId(n.id)}
      >
        {checkMode && (
          <Checkbox label={`选中 ${n.name}`} isSelected={checked.has(n.id)} onChange={(v) => setChecked((prev) => { const s = new Set(prev); if (v) s.add(n.id); else s.delete(n.id); return s; })} />
        )}
        {(() => { const t = fileTreeIconTone(n.name, n.kind); return (
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${t.wrap}`}>
            {n.kind === "folder" ? <FolderSvg size={15} filled={t.filled} className="shrink-0" /> : <FileSvg size={15} filled={t.filled} className="shrink-0" />}
          </span>
        ); })()}
        <span className="truncate">{n.name}</span>
      </div>
    );
    if (n.kind === "folder") {
      return (
        <Disclosure key={n.id} defaultExpanded={depth === 0} id={`tree-${n.id}`}>
          <Disclosure.Heading>
            <Disclosure.Trigger className="flex w-full items-center justify-between rounded-lg">
              <span className="flex min-w-0 flex-1 items-center gap-1">{row}</span>
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="p-0">{(n.children ?? []).map((c) => renderNode(c, depth + 1))}</Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      );
    }
    return <div key={n.id}>{row}</div>;
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs"><Switch label="复选框选择模式" checked={checkMode} onChange={setCheckMode} /> 复选框模式</label>
        <Segmented value={guides} onChange={setGuides} ariaLabel="缩进参考线" options={[{ value: "always", label: "参考线常显" }, { value: "hover", label: "悬停显" }, { value: "hidden", label: "隐藏" }]} />
        <span className="text-xs text-[var(--dim)]">拖文件到文件夹上可移动；选中相邻项合并圆角（本实现用整行高亮）。Pro 用 RAC Tree / useFileTree / useFileTreeDrag，免费版未导出 Tree，本实现用 Disclosure + 原生拖拽。</span>
      </div>
      <div className="max-w-md rounded-[10px] border border-[var(--border)] p-2" role="tree" aria-label="文件树演示">
        {tree.map((n) => renderNode(n, 0))}
      </div>
      <p className="mt-2 text-xs text-[var(--dim)]">当前选中：{selectedId ?? "无"}{checkMode ? ` · 已勾 ${checked.size} 项` : ""}</p>
    </div>
  );
}

/* Agenda：日 / 周 / 月三视图。Pro 用 CalendarDateTime + useAgenda；
   本实现用本地 Date（Asia/Singapore 时区），snapMinutes 默认 5、
   defaultEventDuration 默认 60、month maxEvents 默认 2，行为契约
   与文档一致；拖拽新建 / 移动 / 改时长、跨天移动、键盘操作都做了。 */
type AgendaEvent = { id: string; title: string; start: Date; end: Date; color?: string; isAllDay?: boolean; isReadOnly?: boolean; status?: "confirmed" | "unconfirmed" | "declined" };

/** Agenda 事件块 soft 配色（style-polish C07）：高饱和实底 + 白字改
 * 彩色文字 + 浅色底；未确认态不在此处理（仍走 surface 白底 + 虚线边框）。
 * 颜色只认 mock 里出现的 6 个色值，其余一律落 surface-3 + dim。 */
export function agendaEventSoft(color?: string): { background: string; color: string } {
  switch (color) {
    case "#0e7490": return { background: "var(--accent-bg)", color: "var(--accent-strong)" };
    case "#dc2626": return { background: "var(--danger-bg)", color: "var(--danger)" };
    case "#7c3aed": return { background: "var(--violet-bg)", color: "var(--violet-strong)" };
    case "#047857": return { background: "var(--ok-bg)", color: "var(--ok)" };
    case "#b45309": return { background: "var(--warn-bg)", color: "var(--warn)" };
    default: return { background: "var(--surface-3)", color: "var(--dim)" };
  }
}
const HOUR_PX = 60;
const snapMin = (m: number, snap = 5) => Math.round(m / snap) * snap;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const mins = (d: Date) => d.getHours() * 60 + d.getMinutes();
const withMins = (day: Date, m: number) => { const c = startOfDay(day); c.setMinutes(m); return c; };
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function AgendaDemo() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [cursor, setCursor] = useState<Date>(() => today);
  const [events, setEvents] = useState<AgendaEvent[]>(() => [
    { id: "e1", title: "群例会", start: withMins(addDays(today, 0), 9 * 60), end: withMins(addDays(today, 0), 10 * 60), color: "#0e7490" },
    { id: "e2", title: "复核 9.8 分广告", start: withMins(addDays(today, 0), 10 * 60 + 30), end: withMins(addDays(today, 0), 11 * 60), color: "#dc2626", status: "unconfirmed" },
    { id: "e3", title: "发版窗口", start: withMins(addDays(today, 1), 14 * 60), end: withMins(addDays(today, 1), 15 * 60 + 30), color: "#7c3aed", isReadOnly: true },
    { id: "e4", title: "周报（已拒）", start: withMins(addDays(today, 2), 16 * 60), end: withMins(addDays(today, 2), 17 * 60), color: "#64748b", status: "declined" },
    { id: "e5", title: "新人验证复盘", start: withMins(addDays(today, -1), 11 * 60), end: withMins(addDays(today, -1), 12 * 60), color: "#047857" },
    { id: "a1", title: "全天：观察期", start: addDays(today, 0), end: addDays(today, 2), isAllDay: true, color: "#b45309" },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allDayOpen, setAllDayOpen] = useState(true);
  const [draft, setDraft] = useState<{ day: Date; from: number; to: number } | null>(null);
  const dragRef = useRef<{ id: string; mode: "move" | "resize"; startY: number; startX: number; origStart: Date; origEnd: Date; origDay: Date } | null>(null);
  const now = useNowMinute();
  const weekStart = useMemo(() => { const d = startOfDay(cursor); const dow = (d.getDay() + 6) % 7; return addDays(d, -dow); }, [cursor]);
  const visibleDays = view === "day" ? [cursor] : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [];
  const nav = (dir: -1 | 1) => setCursor((c) => addDays(c, dir * (view === "month" ? 30 : view === "week" ? 7 : 1)));
  const heading = view === "month"
    ? `${cursor.getFullYear()} 年 ${cursor.getMonth() + 1} 月`
    : `${(visibleDays[0]?.getMonth() ?? 0) + 1} 月 ${visibleDays[0]?.getDate()} 日 – ${(visibleDays[visibleDays.length - 1]?.getMonth() ?? 0) + 1} 月 ${visibleDays[visibleDays.length - 1]?.getDate()} 日`;
  const dayEvents = (day: Date) => events.filter((e) => !e.isAllDay && sameDay(e.start, day)).sort((a, b) => mins(a.start) - mins(b.start));
  const allDayEvents = events.filter((e) => e.isAllDay);
  const isPast = (e: AgendaEvent) => e.end < now;
  const createEvent = (day: Date, from: number, to: number) => {
    const id = `e${Date.now()}`;
    setEvents((prev) => [...prev, { id, title: "新建事件", start: withMins(day, from), end: withMins(day, Math.max(to, from + 15)), color: "#0e7490" }]);
    setSelectedId(id);
    toast.success("演示：已新建 1 小时事件（点标题可改名，见下方编辑行）。");
  };
  const onColumnPointerDown = (day: Date) => (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-agenda-event]")) return;
    const col = e.currentTarget;
    const rect = col.getBoundingClientRect();
    const from = snapMin(clamp(((e.clientY - rect.top) / HOUR_PX) * 60, 0, 24 * 60 - 5));
    let curTo = from;
    const move = (ev: PointerEvent) => {
      const r = col.getBoundingClientRect();
      curTo = snapMin(clamp(((ev.clientY - r.top) / HOUR_PX) * 60, 0, 24 * 60));
      setDraft({ day, from: Math.min(from, curTo), to: Math.max(from, curTo) });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDraft(null);
      const moved = Math.abs(ev.clientY - e.clientY) > 4;
      if (moved) { if (curTo > from) createEvent(day, from, curTo); }
      else createEvent(day, from, from + 60);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onEventPointerDown = (ev: AgendaEvent, mode: "move" | "resize") => (e: React.PointerEvent) => {
    if (ev.isReadOnly) return;
    e.stopPropagation();
    dragRef.current = { id: ev.id, mode, startY: e.clientY, startX: e.clientX, origStart: ev.start, origEnd: ev.end, origDay: startOfDay(ev.start) };
    const move = (pe: PointerEvent) => {
      const d = dragRef.current; if (!d) return;
      const dyMin = snapMin(((pe.clientY - d.startY) / HOUR_PX) * 60);
      const dxDays = Math.round((pe.clientX - d.startX) / 120);
      setEvents((prev) => prev.map((x) => {
        if (x.id !== d.id) return x;
        if (d.mode === "resize") {
          const dur = Math.max(15, mins(d.origEnd) - mins(d.origStart) + dyMin);
          return { ...x, end: withMins(d.origDay, mins(d.origStart) + dur) };
        }
        const day = addDays(d.origDay, view === "day" ? 0 : dxDays);
        const startM = clamp(mins(d.origStart) + dyMin, 0, 24 * 60 - 15);
        const dur = mins(d.origEnd) - mins(d.origStart);
        return { ...x, start: withMins(day, startM), end: withMins(day, Math.min(24 * 60, startM + dur)) };
      }));
    };
    const up = () => { dragRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onEventKeyDown = (ev: AgendaEvent) => (e: React.KeyboardEvent) => {
    if (ev.isReadOnly && e.key !== "Enter") return;
    const dur = mins(ev.end) - mins(ev.start);
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setEvents((prev) => prev.filter((x) => x.id !== ev.id)); setSelectedId(null); toast.info("演示：事件已删除。"); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(ev.id); }
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const d = (e.key === "ArrowUp" ? -5 : 5);
      setEvents((prev) => prev.map((x) => {
        if (x.id !== ev.id) return x;
        if (e.shiftKey) return { ...x, end: withMins(startOfDay(x.start), clamp(mins(x.end) + d, mins(x.start) + 15, 24 * 60)) };
        const s = clamp(mins(x.start) + d, 0, 24 * 60 - dur);
        return { ...x, start: withMins(startOfDay(x.start), s), end: withMins(startOfDay(x.start), s + dur) };
      }));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dd = e.key === "ArrowLeft" ? -1 : 1;
      setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, start: addDays(x.start, dd), end: addDays(x.end, dd) } : x)));
    }
  };
  const selected = events.find((e) => e.id === selectedId) ?? null;
  const monthCells = useMemo(() => {
    if (view !== "month") return [];
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);
  const nowLineTop = (mins(now) / 60) * HOUR_PX;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{heading}</h3>
        <Segmented value={view} onChange={setView} ariaLabel="视图" options={[{ value: "day", label: "日" }, { value: "week", label: "周" }, { value: "month", label: "月" }]} />
        <Button size="sm" variant="secondary" onClick={() => nav(-1)} aria-label="上一页">‹</Button>
        <Button size="sm" variant="secondary" onClick={() => setCursor(today)}>Today</Button>
        <Button size="sm" variant="secondary" onClick={() => nav(1)} aria-label="下一页">›</Button>
        <span className="text-xs text-[var(--dim)]">拖空白格新建、拖事件移动、拖底部边缘改时长（5 分钟吸附）；点空白格新建 60 分钟；键盘：方向键 ±5 分钟 / ±1 天，Shift+方向键改时长，Delete 删除，Enter 选中。当前时间线每分钟更新。</span>
      </div>
      {view !== "month" && (
        <div>
          <div className="flex items-center gap-2 rounded-t-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">
            <Button size="sm" variant="ghost" aria-label={allDayOpen ? "收起全天事件" : "展开全天事件"} onClick={() => setAllDayOpen(!allDayOpen)}>{allDayOpen ? "▾" : "▸"} all-day</Button>
            <span className="text-xs text-[var(--dim)]">{allDayOpen ? `${allDayEvents.length} 个全天事件` : visibleDays.map((d) => `${d.getDate()}日 ${allDayEvents.filter((e) => e.start <= d && addDays(e.end, -1) >= d).length} 个`).join(" · ")}</span>
          </div>
          {allDayOpen && allDayEvents.length > 0 && (
            <div className="space-y-1 border border-t-0 border-[var(--border)] px-2 py-2">
              {allDayEvents.map((e) => (
                <div key={e.id} className="rounded-md px-2 py-1 text-xs font-medium" style={agendaEventSoft(e.color)}>
                  {e.title}（{e.start.getMonth() + 1}/{e.start.getDate()} – {addDays(e.end, -1).getMonth() + 1}/{addDays(e.end, -1).getDate()}）
                </div>
              ))}
            </div>
          )}
          <div className="flex border border-t-0 border-[var(--border)]">
            <div className="w-[58px] shrink-0 border-r border-[var(--border)]">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex justify-end pr-1 text-[10px] text-[var(--dim)]" style={{ height: HOUR_PX, transform: "translateY(-6px)" }}>{h}:00</div>
              ))}
            </div>
            <div className="relative flex min-w-0 flex-1">
              {visibleDays.map((day) => (
                <div key={day.toISOString()} className={`relative min-w-0 flex-1 border-r border-[var(--border)] last:border-r-0 ${day.getDay() === 0 || day.getDay() === 6 ? "bg-[var(--surface-2)]" : ""}`} data-weekend={day.getDay() === 0 || day.getDay() === 6 ? true : undefined} onPointerDown={onColumnPointerDown(day)} style={{ height: 24 * HOUR_PX }}>
                  <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-1 py-1 text-center text-[11px] font-medium" data-today={sameDay(day, today) ? true : undefined}>
                    {WEEKDAYS[day.getDay()]} {day.getMonth() + 1}/{day.getDate()}
                  </div>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="border-b border-[var(--border)]/50" style={{ height: HOUR_PX }} />
                  ))}
                  {sameDay(day, now) && (
                    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowLineTop }}>
                      <span className={`absolute -left-0 -top-2 rounded bg-[var(--danger)] px-1 text-[10px] font-bold text-white ${LIB_DARK_DANGER_FIX_CLASS}`}>{`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`}</span>
                      <span className="block h-0.5 bg-[var(--danger)]" />
                    </div>
                  )}
                  {dayEvents(day).map((e) => {
                    const top = (mins(e.start) / 60) * HOUR_PX;
                    const h = Math.max(((mins(e.end) - mins(e.start)) / 60) * HOUR_PX - 2, 18);
                    const short = mins(e.end) - mins(e.start) < 30;
                    return (
                      <div
                        key={e.id} data-agenda-event tabIndex={0} role="button" aria-label={`${e.title} ${e.start.getHours()}:${String(e.start.getMinutes()).padStart(2, "0")}–${e.end.getHours()}:${String(e.end.getMinutes()).padStart(2, "0")}${e.isReadOnly ? "（只读）" : ""}`}
                        data-status={e.status} data-past={isPast(e) ? true : undefined} data-short={short ? true : undefined} data-readonly={e.isReadOnly ? true : undefined}
                        onPointerDown={onEventPointerDown(e, "move")}
                        onKeyDown={onEventKeyDown(e)}
                        onClick={() => setSelectedId(e.id)}
                        className={`absolute inset-x-1 z-10 overflow-hidden rounded-md px-1.5 py-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${selectedId === e.id ? "ring-2 ring-[var(--accent)]" : ""} ${e.status === "unconfirmed" ? "border border-dashed" : "border border-transparent"} ${isPast(e) ? "opacity-60" : ""}`}
                        style={{ top, height: h, ...(e.status === "unconfirmed" ? { background: "var(--surface)", color: "var(--text)" } : agendaEventSoft(e.color)), borderColor: e.status === "unconfirmed" ? (e.color ?? "#0e7490") : undefined }}
                      >
                        <span className={`block truncate font-medium ${e.status === "declined" ? "line-through" : ""}`}>{e.title}</span>
                        {!short && <span className="block opacity-90">{e.start.getHours()}:{String(e.start.getMinutes()).padStart(2, "0")} – {e.end.getHours()}:{String(e.end.getMinutes()).padStart(2, "0")}{e.isReadOnly ? " · 只读" : ""}</span>}
                        {!e.isReadOnly && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" onPointerDown={onEventPointerDown(e, "resize")} />}
                      </div>
                    );
                  })}
                  {draft && sameDay(draft.day, day) && (
                    <div aria-hidden="true" className="absolute inset-x-1 z-10 rounded-md border border-dashed border-[var(--accent)] bg-[var(--accent-bg)]" style={{ top: (draft.from / 60) * HOUR_PX, height: Math.max(((draft.to - draft.from) / 60) * HOUR_PX, 18) }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {view === "month" && (
        <div className="rounded-[10px] border border-[var(--border)]">
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)] text-center text-[11px] font-medium">
            {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((w) => <div key={w} className="py-1.5">{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((day) => {
              const evs = dayEvents(day);
              const shown = evs.slice(0, 2);
              const more = evs.length - shown.length;
              const inMonth = day.getMonth() === cursor.getMonth();
              return (
                <div key={day.toISOString()} className={`min-h-24 border-b border-r border-[var(--border)] p-1 last:border-r-0 ${day.getDay() === 0 || day.getDay() === 6 ? "bg-[var(--surface-2)]" : ""} ${inMonth ? "" : "opacity-50"}`} data-today={sameDay(day, today) ? true : undefined}>
                  <button type="button" className={`text-xs font-medium ${sameDay(day, today) ? "rounded-full bg-[var(--accent)] px-1.5 text-white " + LIB_DARK_ACCENT_FIX_CLASS : ""}`} onClick={() => { setCursor(day); setView("day"); }}>{day.getDate()}</button>
                  {shown.map((e) => (
                    <button key={e.id} type="button" className="mt-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium" style={agendaEventSoft(e.color)} onClick={() => setSelectedId(e.id)}>{e.title}</button>
                  ))}
                  {more > 0 && <button type="button" className="mt-0.5 text-[11px] text-[var(--accent)]" onClick={() => { setCursor(day); setView("day"); }}>{more} more</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {selected && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--border)] px-3 py-2">
          <span className="text-[13px] font-medium">选中：{selected.title}</span>
          <Input aria-label="事件标题" value={selected.title} onChange={(e) => setEvents((prev) => prev.map((x) => (x.id === selected.id ? { ...x, title: e.target.value } : x)))} className="w-48" />
          <Select aria-label="事件状态" selectedKey={selected.status ?? "confirmed"} onSelectionChange={(k) => setEvents((prev) => prev.map((x) => (x.id === selected.id ? { ...x, status: (k as AgendaEvent["status"]) ?? "confirmed" } : x)))} className="w-36">
            <option value="confirmed">已确认</option>
            <option value="unconfirmed">未确认（虚线）</option>
            <option value="declined">已拒（删除线）</option>
          </Select>
          <Button size="sm" variant="secondary" onClick={() => { setEvents((prev) => prev.filter((x) => x.id !== selected.id)); setSelectedId(null); }}>删除事件</Button>
        </div>
      )}
    </div>
  );
}

/* J-C1/C07：幻灯片不再是大面积高饱和渐变——低饱和单色底 + 封面照片
 * （picsum seed 占位，加载失败时只剩低饱和底色，不留破图）+ 标题 /
 * 副信息 / meta 行内容层。 */
const CAROUSEL_SLIDES = [
  { title: "总览", desc: "KPI 行 + 图表 + 表格", meta: "今日 128 条命中", cover: "https://picsum.photos/seed/carousel-overview/640/240", bg: "linear-gradient(135deg,#475569,#64748b)" },
  { title: "查杀队列", desc: "待处置条目与行内操作", meta: "12 条待处理", cover: "https://picsum.photos/seed/carousel-queue/640/240", bg: "linear-gradient(135deg,#334155,#475569)" },
  { title: "闭环中心", desc: "验证 / 申诉 / 信任分", meta: "申诉 3 条待复核", cover: "https://picsum.photos/seed/carousel-loop/640/240", bg: "linear-gradient(135deg,#3f3f46,#52525b)" },
  { title: "群组与 Bot", desc: "4 个群 · 8 项能力", meta: "4 个群 · 4,211 位成员", cover: "https://picsum.photos/seed/carousel-groups/640/240", bg: "linear-gradient(135deg,#44403c,#57534e)" },
  { title: "处置日志", desc: "审计与回流调阈值", meta: "今日已处置 96 条", cover: "https://picsum.photos/seed/carousel-logs/640/240", bg: "linear-gradient(135deg,#1e293b,#334155)" },
];
function CarouselView({ layout, loop, perView, autoplay }: { layout: "inplace" | "miniatures"; loop: boolean; perView: number; autoplay: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = CAROUSEL_SLIDES.length;
  const go = useCallback((i: number) => {
    const el = ref.current; if (!el) return;
    const w = el.clientWidth / perView;
    let next = i;
    if (loop) next = ((i % count) + count) % count;
    else next = clamp(i, 0, count - perView);
    el.scrollTo({ left: next * w, behavior: "smooth" });
  }, [count, loop, perView]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth / perView;
      setIndex(Math.round(el.scrollLeft / w));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [perView]);
  useEffect(() => {
    if (!autoplay || paused) return;
    const t = window.setInterval(() => go(index + 1), 3000);
    return () => window.clearInterval(t);
  }, [autoplay, paused, index, go]);
  const dots = count - perView + 1;
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative">
        <div ref={ref} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CAROUSEL_SLIDES.map((s) => (
            <div key={s.title} className="h-36 shrink-0 snap-start p-1" style={{ flexBasis: `${100 / perView}%` }}>
              <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-lg text-white" style={{ background: s.bg }}>
                <img src={s.cover} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="relative p-3">
                  <p className="text-base font-semibold">{s.title}</p>
                  <p className="text-xs opacity-90">{s.desc}</p>
                  <p className="mt-1 text-[11px] opacity-75">{s.meta}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {layout === "inplace" && (
          <>
            <Button size="sm" variant="secondary" aria-label="上一张" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full !px-2" onClick={() => go(index - 1)}>‹</Button>
            <Button size="sm" variant="secondary" aria-label="下一张" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full !px-2" onClick={() => go(index + 1)}>›</Button>
          </>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex gap-1.5">
          {dots > 1 && Array.from({ length: dots }, (_, i) => (
            <button key={i} type="button" aria-label={`跳到第 ${i + 1} 组`} onClick={() => go(i)} className={`h-2 w-2 min-h-0 rounded-full transition-all ${i === index ? "bg-[var(--accent)]" : "border border-[var(--border-strong)] bg-transparent"}`} />
          ))}
        </span>
        {layout === "inplace" && (
          <span className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => go(index - 1)}>上一张</Button>
            <Button size="sm" variant="secondary" onClick={() => go(index + 1)}>下一张</Button>
          </span>
        )}
      </div>
      {layout === "miniatures" && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {CAROUSEL_SLIDES.map((s, i) => (
            <button key={s.title} type="button" onClick={() => go(i)} aria-label={`缩略图 ${s.title}`} className={`h-12 w-20 shrink-0 rounded-md text-[11px] font-medium text-white ${i === index ? "ring-2 ring-[var(--accent)]" : "opacity-70"}`} style={{ background: s.bg }}>{s.title}</button>
          ))}
        </div>
      )}
    </div>
  );
}
function CarouselDemo() {
  const [layout, setLayout] = useState<"inplace" | "miniatures" | "modal">("inplace");
  const [loop, setLoop] = useState(true);
  const [perView, setPerView] = useState(1);
  const [autoplay, setAutoplay] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={layout} onChange={setLayout} ariaLabel="布局" options={[{ value: "inplace", label: "in-place" }, { value: "miniatures", label: "miniatures" }, { value: "modal", label: "modal" }]} />
        <label className="flex items-center gap-2 text-xs"><Switch label="无限循环" checked={loop} onChange={setLoop} /> loop</label>
        <label className="flex items-center gap-2 text-xs"><Switch label="自动播放" checked={autoplay} onChange={setAutoplay} /> autoplay</label>
        <Segmented value={String(perView)} onChange={(v) => setPerView(Number(v))} ariaLabel="一屏几张" options={[{ value: "1", label: "1 张" }, { value: "2", label: "2 张" }, { value: "3", label: "3 张" }]} />
      </div>
      {layout === "modal" ? (
        <div>
          <Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} onClick={() => setModalOpen(true)}>打开 modal 轮播</Button>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="轮播（modal 布局）" wide>
            <CarouselView layout="inplace" loop={loop} perView={1} autoplay={autoplay} />
          </Modal>
        </div>
      ) : (
        <CarouselView layout={layout} loop={loop} perView={perView} autoplay={autoplay} />
      )}
      <p className="mt-2 text-xs text-[var(--dim)]">Pro 用 embla-carousel（MIT）+ HeroUI Button 箭头（tertiary、sm、纯图标），setApi 取 Embla API 做程序化控制；本实现是同行为契约的 scroll-snap 轮播（零新依赖，见报告 §待批依赖：embla-carousel 批后按替换点换装，API 面不变）。</p>
    </div>
  );
}

function HoloCardDemo() {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const [hoverActive, setHoverActive] = useState(true);
  const [interactive, setInteractive] = useState(true);
  const [isHover, setIsHover] = useState(false);
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || reduced) return;
    if (hoverActive && !isHover) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ rx: (0.5 - py) * 24, ry: (px - 0.5) * 24, gx: px * 100, gy: py * 100 });
  };
  const reset = () => { setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 }); setIsHover(false); };
  const active = interactive && !reduced && (!hoverActive || isHover);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs"><Switch label="平时平放、悬停才建 3D 上下文" checked={hoverActive} onChange={setHoverActive} /> activateOnHover</label>
        <label className="flex items-center gap-2 text-xs"><Switch label="可交互" checked={interactive} onChange={setInteractive} /> isInteractive</label>
        <span className="text-xs text-[var(--dim)]">默认竖版 302×453；prefers-reduced-motion 时保持静止{reduced ? "（当前系统已开减弱动态，已静止）" : "（当前系统未开）"}。</span>
      </div>
      <div className="flex justify-center [perspective:900px]">
        <div
          role="img" aria-label="全息会员卡演示：群盾卫士 Pro 会员"
          className="relative h-[453px] w-[302px] max-w-full overflow-hidden rounded-2xl border border-[var(--border)] text-white transition-transform duration-150 ease-out"
          style={{
            background: "linear-gradient(150deg,#1e293b 0%,#334155 55%,#475569 100%)",
            transform: active ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` : "none",
            transformStyle: "preserve-3d",
          }}
          onPointerMove={onMove}
          onPointerEnter={() => setIsHover(true)}
          onPointerLeave={reset}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: active ? `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,.45), transparent 45%)` : "none" }} />
          <div className="absolute inset-0 p-5" style={{ transform: active ? `translate3d(${(tilt.gx - 50) / 8}px, ${(tilt.gy - 50) / 8}px, 30px)` : undefined }}>
            <p className="text-xs tracking-widest opacity-80">群盾卫士 · PRO</p>
            <p className="mt-24 text-2xl font-bold leading-8">DeePlanGroup<br />创始会员</p>
            <p className="mt-2 text-xs opacity-80">4 个群 · 4,211 位成员 · 13 类查杀</p>
            <p className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-xs"><span>NO. 0001</span><span>2026 – 2027</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Map：免依赖的 slippy 瓦片查看器（OpenFreeMap，无需 key）。
   Pro 用 maplibre-gl（MIT）+ 自传样式 URL；当前构建未装该包时，
   同行为契约的查看器照样可用：拖动平移、滚轮缩放、标记 / 弹窗 /
   路线（GeoJSON 线转 SVG 折线，不贴合道路）、缩放 / 罗盘 / 定位 /
   全屏控件、深浅色跟随 data-theme。maplibre-gl 列在报告待批清单，
   批后按替换点换装。 */
type MapMarker = { id: string; lat: number; lng: number; label: string; desc: string; labelDy?: number };
const MAP_MARKERS: MapMarker[] = [
  { id: "m1", lat: 1.3521, lng: 103.8198, label: "DeePlanGroup", desc: "74 位成员 · 新加坡" },
  { id: "m2", lat: 1.2902, lng: 103.8519, label: "CryptoPush_Example", desc: "2,241 位成员" },
  { id: "m3", lat: 1.31, lng: 103.9, label: "ForwardHubBOT", desc: "1,030 位成员" },
  { id: "m4", lat: 1.28, lng: 103.78, label: "@NextCLi 讨论组", desc: "868 位成员", labelDy: 12 },
];
const MAP_ROUTE: [number, number][] = [[1.3521, 103.8198], [1.31, 103.9], [1.2902, 103.8519]];
function MapDemo() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark");
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.getAttribute("data-theme") === "dark"));
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => obs.disconnect();
  }, []);
  const [center, setCenter] = useState({ lat: 1.32, lng: 103.84 });
  const [zoom, setZoom] = useState(11);
  const [size, setSize] = useState({ w: 600, h: 360 });
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; lat: number; lng: number } | null>(null);
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setZoom((z) => clamp(z + (e.deltaY < 0 ? 1 : -1), 3, 16)); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const world = 256 * 2 ** zoom;
  const project = useCallback((lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * world;
    const s = Math.sin((lat * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world;
    return { x, y };
  }, [world]);
  const c = project(center.lat, center.lng);
  const toScreen = useCallback((lat: number, lng: number) => {
    const p = project(lat, lng);
    return { x: p.x - (c.x - size.w / 2), y: p.y - (c.y - size.h / 2) };
  }, [project, c.x, c.y, size.w, size.h]);
  const styleUrl = dark ? "https://tiles.openfreemap.org/dark/{z}/{x}/{y}.png" : "https://tiles.openfreemap.org/positron/{z}/{x}/{y}.png";
  const x0 = Math.floor((c.x - size.w / 2) / 256);
  const x1 = Math.floor((c.x + size.w / 2) / 256);
  const y0 = Math.floor((c.y - size.h / 2) / 256);
  const y1 = Math.floor((c.y + size.h / 2) / 256);
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) tiles.push({ x: tx, y: ty, left: tx * 256 - (c.x - size.w / 2), top: ty * 256 - (c.y - size.h / 2) });
  const clustered = zoom < 11;
  const markersOnScreen = MAP_MARKERS.map((m) => ({ ...m, ...toScreen(m.lat, m.lng) }));
  const routePts = MAP_ROUTE.map(([lat, lng]) => toScreen(lat, lng));
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, lat: center.lat, lng: center.lng };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const start = project(d.lat, d.lng);
    const nx = start.x - (e.clientX - d.x);
    const ny = start.y - (e.clientY - d.y);
    const lng = (nx / world) * 360 - 180;
    const n = Math.PI * (1 - (2 * ny) / world);
    const lat = clamp((180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), -85, 85);
    setCenter({ lat, lng });
  };
  return (
    <div>
      <div ref={boxRef} className="relative h-[360px] touch-none select-none overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-3)]" role="application" aria-label="地图演示：新加坡四个群位置" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerLeave={() => { dragRef.current = null; }}>
        {tiles.map((t) => (
          <img key={`${t.x}/${t.y}/${zoom}`} src={styleUrl.replace("{z}", String(zoom)).replace("{x}", String(t.x)).replace("{y}", String(t.y))} alt="" draggable={false} className="absolute h-64 w-64" style={{ left: t.left, top: t.top }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
        ))}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <polyline points={routePts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#0e7490" strokeWidth="3" strokeDasharray="6 4" />
        </svg>
        {clustered ? (
          <button type="button" className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white shadow-lg ${LIB_DARK_ACCENT_FIX_CLASS}`} style={{ left: 300, top: 180 }} onClick={() => setZoom(12)} aria-label={`4 个标记已聚合，点我放大到 12 级展开`}>4</button>
        ) : (
          markersOnScreen.map((m) => (
            <button key={m.id} type="button" aria-label={`标记 ${m.label}`} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: m.x, top: m.y }} onClick={(e) => { e.stopPropagation(); setSelected(m); }}>
              <PinSvg size={26} className="text-[var(--danger)] drop-shadow" />
              <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface)] px-1.5 py-0.5 text-[11px] font-medium shadow" style={{ marginTop: m.labelDy ?? 2 }}>{m.label}</span>
            </button>
          ))
        )}
        {selected && !clustered && (
          <div role="dialog" aria-label={`${selected.label} 详情`} className="absolute z-10 w-56 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl" style={{ left: clamp(toScreen(selected.lat, selected.lng).x, 120, size.w - 120), top: Math.max(toScreen(selected.lat, selected.lng).y - 110, 8) }}>
            <p className="flex items-center justify-between text-sm font-semibold">{selected.label}<button type="button" aria-label="关闭弹窗" onClick={() => setSelected(null)}><Icon name="x" size={14} /></button></p>
            <p className="mt-1 text-xs text-[var(--dim)]">{selected.desc}</p>
            <p className="mt-1 text-xs text-[var(--dim)]">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</p>
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <Button size="sm" variant="secondary" aria-label="放大" onClick={() => setZoom((z) => clamp(z + 1, 3, 16))}>＋</Button>
          <Button size="sm" variant="secondary" aria-label="缩小" onClick={() => setZoom((z) => clamp(z - 1, 3, 16))}>－</Button>
          <Button size="sm" variant="secondary" aria-label="回到正北并居中新加坡" onClick={() => { setCenter({ lat: 1.32, lng: 103.84 }); setZoom(11); toast.info("演示：已回到正北（本实现无旋转）。"); }}>🧭</Button>
          <Button size="sm" variant="secondary" aria-label="定位到新加坡" onClick={() => { setCenter({ lat: 1.3521, lng: 103.8198 }); setZoom(13); }}>◎</Button>
          <Button size="sm" variant="secondary" aria-label="全屏" onClick={() => { void boxRef.current?.requestFullscreen?.(); }}>⛶</Button>
        </div>
        <p className="absolute bottom-1 left-2 rounded bg-[var(--surface)]/85 px-1.5 py-0.5 text-[10px] text-[var(--dim)]">© OpenStreetMap contributors © OpenFreeMap · {dark ? "Dark" : "Positron"} · z{zoom}</p>
      </div>
      <p className="mt-2 text-xs text-[var(--dim)]">拖动平移、滚轮缩放；11 级以下 4 个标记聚合为 1 个数字徽章，点徽章放大展开；路线是 GeoJSON 线转 SVG 折线（不算路、不贴合道路）。瓦片加载失败时该格留空，不会整图崩掉；离线环境下地图底图不可见，但标记 / 路线 / 控件照常可点。</p>
      <p className="mt-1 text-xs text-[var(--dim)]">当前中心 {center.lat.toFixed(4)}, {center.lng.toFixed(4)}（拖动会变，可用“定位”回到新加坡）。</p>
    </div>
  );
}

/* RichTextEditor：免依赖的 contenteditable 编辑器。
   Pro 用 @tiptap/*（MIT）+ HeroUI Toolbar，BubbleMenu / FloatingMenu；
   当前构建未装该包时，同行为契约的编辑器照样可用：工具栏命令、
   选中气泡菜单、空行浮动菜单（斜杠菜单）、链接弹窗、Tiptap JSON 为
   主另给 HTML / 纯文本 / 字数统计、字数上限 data-over-limit、
   primary / secondary 表面。@tiptap/* 列在报告待批清单。 */
type RteBlock = { type: string; text: string };
const INITIAL_RTE_HTML = "<p>欢迎使用 <b>群盾卫士</b> 公告编辑器。选中文字看气泡菜单，空行敲 <code>/</code> 看斜杠菜单。</p>";
function RichTextEditorDemo() {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<"primary" | "secondary">("primary");
  const [html, setHtml] = useState("<p>欢迎使用 <b>群盾卫士</b> 公告编辑器。选中文字看气泡菜单，空行敲 <code>/</code> 看斜杠菜单。</p>");
  const [plain, setPlain] = useState("");
  const [blocks, setBlocks] = useState<RteBlock[]>([]);
  const [bubble, setBubble] = useState<{ x: number; y: number } | null>(null);
  const [slash, setSlash] = useState<{ x: number; y: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const savedRange = useRef<Range | null>(null);
  const LIMIT = 500;
  const sync = useCallback(() => {
    const el = editorRef.current; if (!el) return;
    const h = el.innerHTML;
    const t = el.innerText ?? "";
    setHtml(h); setPlain(t);
    const bs: RteBlock[] = [];
    el.childNodes.forEach((n) => {
      const e = n as HTMLElement;
      bs.push({ type: e.tagName ? e.tagName.toLowerCase() : "text", text: (e.textContent ?? "").slice(0, 80) });
    });
    setBlocks(bs);
  }, []);
  useEffect(() => {
    // 编辑器内容只在挂载时写一次（ref 直写），之后 DOM 完全不受控：
    // 之前这里用 dangerouslySetInnerHTML 挂字面量，sync() 一 setState、
    // 组件一重渲染，React 就把编辑器 DOM 重置回字面量，刚敲的字全被
    // 吃掉（实测：敲 Q 后 state 里有 Q，DOM 里没有）。改成 ref 初始化
    // 后，输入只走 sync() 读，不再有任何渲染写回编辑器。
    const el = editorRef.current;
    if (el && !el.innerHTML) el.innerHTML = INITIAL_RTE_HTML;
    sync();
  }, [sync]);
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setBubble(null); return; }
      const range = sel.getRangeAt(0);
      const wrap = wrapRef.current;
      if (!wrap || !wrap.contains(range.commonAncestorContainer)) { setBubble(null); return; }
      const r = range.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      setBubble({ x: r.left - w.left + r.width / 2, y: r.top - w.top - 8 });
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);
  const exec = (cmd: string, val?: string) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); sync(); };
  const formatBlock = (tag: string) => { exec("formatBlock", tag); setSlash(null); };
  const saveRange = () => { const sel = window.getSelection(); if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange(); };
  const restoreRange = () => { const sel = window.getSelection(); if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); } };
  const overLimit = plain.length > LIMIT;
  const slashItems: { label: string; run: () => void }[] = [
    { label: "标题 1", run: () => formatBlock("h1") },
    { label: "标题 2", run: () => formatBlock("h2") },
    { label: "标题 3", run: () => formatBlock("h3") },
    { label: "无序列表", run: () => { exec("insertUnorderedList"); setSlash(null); } },
    { label: "有序列表", run: () => { exec("insertOrderedList"); setSlash(null); } },
    { label: "引用", run: () => formatBlock("blockquote") },
    { label: "代码块", run: () => formatBlock("pre") },
  ];
  return (
    <div ref={wrapRef} className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={variant} onChange={setVariant} ariaLabel="表面变体" options={[{ value: "primary", label: "primary" }, { value: "secondary", label: "secondary（Surface / Modal / Sheet / Drawer 内）" }]} />
        <span className={`text-xs ${overLimit ? "font-semibold text-[var(--danger)]" : "text-[var(--dim)]"}`} data-over-limit={overLimit ? true : undefined}>字数 {plain.length} / {LIMIT}{overLimit ? " · 已超限" : ""}</span>
      </div>
      <div className={`overflow-hidden rounded-[10px] border ${overLimit ? "border-[var(--danger)]" : "border-[var(--border)]"} ${variant === "secondary" ? "bg-[var(--surface-2)]" : "bg-[var(--surface)]"}`}>
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] px-2 py-1.5" role="toolbar" aria-label="编辑器工具栏">
          {([["B", "bold", "加粗"], ["I", "italic", "斜体"], ["U", "underline", "下划线"], ["S", "strikeThrough", "删除线"]] as [string, string, string][]).map(([label, cmd, name]) => (
            <Button key={cmd} size="sm" variant="ghost" aria-label={name} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd)}><b className={cmd === "italic" ? "italic" : cmd === "underline" ? "underline" : cmd === "strikeThrough" ? "line-through" : ""}>{label}</b></Button>
          ))}
          <Button size="sm" variant="ghost" aria-label="行内代码" onMouseDown={(e) => e.preventDefault()} onClick={() => { const sel = window.getSelection(); const t = sel?.toString() ?? ""; if (t) { document.execCommand("insertHTML", false, `<code>${t.replace(/</g, "&lt;")}</code>`); sync(); } }}>{"</>"}</Button>
          <Button size="sm" variant="ghost" aria-label="引用" onMouseDown={(e) => e.preventDefault()} onClick={() => formatBlock("blockquote")}>“”</Button>
          <Button size="sm" variant="ghost" aria-label="无序列表" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>• 列表</Button>
          <Button size="sm" variant="ghost" aria-label="有序列表" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>1. 列表</Button>
          <Button size="sm" variant="ghost" aria-label="标题 1" onMouseDown={(e) => e.preventDefault()} onClick={() => formatBlock("h1")}>H1</Button>
          <Button size="sm" variant="ghost" aria-label="标题 2" onMouseDown={(e) => e.preventDefault()} onClick={() => formatBlock("h2")}>H2</Button>
          <Button size="sm" variant="ghost" aria-label="标题 3" onMouseDown={(e) => e.preventDefault()} onClick={() => formatBlock("h3")}>H3</Button>
          <Button size="sm" variant="ghost" aria-label="设链接" onMouseDown={(e) => e.preventDefault()} onClick={() => { saveRange(); setLinkOpen(true); }}>🔗</Button>
          <Button size="sm" variant="ghost" aria-label="取消链接" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("unlink")}>🔗✕</Button>
          <Button size="sm" variant="ghost" aria-label="撤销" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")}>↩</Button>
          <Button size="sm" variant="ghost" aria-label="重做" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")}>↪</Button>
          <Button size="sm" variant="ghost" aria-label="清除格式" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")}>清除格式</Button>
          <Button size="sm" variant="ghost" aria-label="清空内容" onMouseDown={(e) => e.preventDefault()} onClick={() => { if (editorRef.current) editorRef.current.innerHTML = ""; sync(); }}>清空</Button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox" aria-multiline="true" aria-label="富文本编辑器"
          className="min-h-32 px-4 py-3 text-sm leading-7 outline-none [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border-strong)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--dim)] [&_code]:rounded [&_code]:bg-[var(--surface-3)] [&_code]:px-1 [&_pre]:rounded-lg [&_pre]:bg-[var(--surface-3)] [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs [&_a]:text-[var(--accent)] [&_a]:underline"
          onInput={(e) => {
            sync();
            const text = e.currentTarget.innerText ?? "";
            if (text.endsWith("/")) {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const r = sel.getRangeAt(0).getBoundingClientRect();
                const w = wrapRef.current?.getBoundingClientRect();
                if (w) setSlash({ x: r.left - w.left, y: r.bottom - w.top + 4 });
              }
            } else setSlash(null);
          }}
          onKeyDown={(e) => { if (e.key === "Escape") { setSlash(null); setBubble(null); } }}
        />
        {bubble && (
          <div role="toolbar" aria-label="选中气泡菜单" className="absolute z-20 flex -translate-x-1/2 -translate-y-full gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg" style={{ left: bubble.x, top: bubble.y }}>
            <Button size="sm" variant="ghost" aria-label="气泡菜单：加粗" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}><b>B</b></Button>
            <Button size="sm" variant="ghost" aria-label="气泡菜单：斜体" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}><i>I</i></Button>
            <Button size="sm" variant="ghost" aria-label="气泡菜单：下划线" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}><u>U</u></Button>
          </div>
        )}
        {slash && (
          <div role="menu" aria-label="斜杠建议菜单" className="absolute z-20 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl" style={{ left: slash.x, top: slash.y }}>
            {slashItems.map((it) => (
              <button key={it.label} type="button" role="menuitem" className="block w-full rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[var(--surface-3)]" onMouseDown={(e) => e.preventDefault()} onClick={it.run}>{it.label}</button>
            ))}
          </div>
        )}
      </div>
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="设置链接" footer={<><Button size="sm" variant="secondary" onClick={() => setLinkOpen(false)}>取消</Button><Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} onClick={() => { restoreRange(); exec("createLink", linkUrl); setLinkOpen(false); }}>确定</Button></>}>
        <Field label="链接地址"><Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" /></Field>
      </Modal>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-[10px] border border-[var(--border)] p-3"><p className="mb-1 text-xs font-medium text-[var(--dim)]">Tiptap JSON（主值）</p><pre className="max-h-36 overflow-auto whitespace-pre-wrap text-[11px] leading-5">{JSON.stringify({ type: "doc", content: blocks.map((b) => ({ type: b.type, content: [{ type: "text", text: b.text }] })) }, null, 1)}</pre></div>
        <div className="rounded-[10px] border border-[var(--border)] p-3"><p className="mb-1 text-xs font-medium text-[var(--dim)]">HTML</p><pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5">{html}</pre></div>
        <div className="rounded-[10px] border border-[var(--border)] p-3"><p className="mb-1 text-xs font-medium text-[var(--dim)]">纯文本</p><pre className="max-h-36 overflow-auto whitespace-pre-wrap text-[11px] leading-5">{plain || "（空）"}</pre></div>
      </div>
    </div>
  );
}

function HeavySection() {
  return (
    <Section id="heavy" title="成页与重型（R2-6）" desc="看板、日程、文件树、轮播、全息卡片、地图、富文本编辑器——每件都是一个能用的小产品，不是截图。">
      <Entry id="kanban" name="Kanban" href={PRO("kanban")} status="lib" note="RAC GridList / GridListItem / DropIndicator + Button 拖拽手柄 + useKanban 三 hook 的等价实现：列宽 240 / 280 / 320 三档，卡片单选 / 多选，空列自定义空状态；拖拽手柄聚焦时出现（本实现另有键盘 ← → 移列按钮）。">
        <KanbanDemo />
      </Entry>
      <Entry id="agenda" name="Agenda" href={PRO("agenda")} status="lib" note="补读结论（404–607 行）：useAgenda 选项全表已核对——startHour 0、endHour 24、slotDuration 60、weekDays 7、selectedEventId、allowsSwipe、timeZone / firstDayOfWeek / hourCycle、snapMinutes 5、defaultEventDuration 60；键盘映射（方向键移、Shift+方向键改时长、Delete 删、Enter 新建）与 ViewSelector size sm、AllDaySection collapsedLabel / expandLabel / collapseLabel、MonthCell maxEvents 2 + moreLabel 均已按文档实现。导航与 Today 用 HeroUI Button，视图切换用 Segment（免费 ToggleButtonGroup）。">
        <AgendaDemo />
      </Entry>
      <Entry id="file-tree" name="FileTree" href={PRO("file-tree")} status="lib" note="RAC Tree / TreeItem / TreeSection / TreeHeader + useFileTree / useFileTreeDrag 的等价实现：Disclosure 展开折叠（带动画）、缩进参考线可常显 / 悬停显 / 隐藏、拖拽移动、复选框选择模式、自定义展开与文件 / 文件夹图标。">
        <FileTreeDemo />
      </Entry>
      <Entry id="carousel" name="Carousel" href={PRO("carousel")} status="lib" note="三种布局 in-place（箭头在视口内）/ modal（箭头在内容区外）/ miniatures（箭头与缩略图行内联）；opts loop 开无限循环；embla-carousel-autoplay 插件对应这里的自动播放开关；setApi 对应 go(i) 程序化控制；Item 上加 basis 类可一屏多张；圆点只有多个吸附点时才显示。">
        <CarouselDemo />
      </Entry>
      <Entry id="holo-card" name="HoloCard" href={PRO("holo-card")} status="lib" note="跟随指针做 3D 倾斜 + 全息眩光，内容层带视差漂移；默认竖版 302×453px；isInteractive={false} 或 prefers-reduced-motion 时保持静止；activateOnHover 让卡片平时平放、悬停时才建 3D 上下文（省移动端内存）。">
        <HoloCardDemo />
      </Entry>
      <Entry id="map" name="Map" href={PRO("map")} status="lib" note="内部用 MapLibre GL，仅子路径导入，需自传 MapLibre 兼容样式 URL；文档示例用 OpenFreeMap 的 Positron（浅色）与 Dark（深色），公开实例无需 API key；支持标记、独立弹窗、路线（GeoJSON 线）、弧线、点聚合、缩放 / 罗盘 / 定位 / 全屏控件；深浅色样式可跟随 data-theme 自动切换。">
        <MapDemo />
      </Entry>
      <Entry id="rich-text-editor" name="RichTextEditor" href={PRO("rich-text-editor")} status="lib" note="依赖 @tiptap/*，仅子路径导入；选中气泡菜单与空行浮动菜单包 Tiptap 的 BubbleMenu / FloatingMenu，内容渲染在 HeroUI Toolbar 内；值以 Tiptap JSON 为主，另给 HTML、纯文本、字数统计；工具栏含 bold / italic / underline / strike / code / blockquote / bulletList / orderedList / codeBlock / heading-1~3，另有 undo / redo / 清除格式 / 清空；链接弹窗可设 / 取消链接；斜杠建议菜单默认触发符 /；字数上限超限有 data-over-limit；分 primary / secondary 两种表面。">
        <RichTextEditorDemo />
      </Entry>
    </Section>
  );
}

/* ---------- 七、AI 类（18 件） ---------- */
/* 补读结论（2026-11-26 逐页读完 18 页）：ApprovalCard 是 Card 包裹的
   多步审批（RadioGroup/CheckboxGroup secondary、CustomInput、Steps
   maxVisible 7、Skip ghost sm / Continue primary sm、onSubmit
   {answers, skipped}，对接 AI SDK needsApproval）；ChainOfThought
   在 Reasoning 内，Step 状态 complete/active/pending/error，active
   步 aria-current="step" 且 ring 是 Loader；ChatAttachment 分 media /
   file 两态，Input 默认 multiple，blob URL 用后 revoke；ChatConversation
   是 role=log 的 stick-to-bottom 视口 + ScrollButton；
   ChatListView 是会话行（Icon/Text/Title/Preview/Meta，comfortable /
   compact）；ChatLoader 主推 Skeleton（Dots/Pulse/Spinner 已废弃，
   改走 Loader 的 dots/pulse/ring）；ChatMessage 分 User 气泡 /
   Assistant 行，variant card 放整轮到 Card 面上；ChatMessageActions
   是 ghost 图标按钮行；ChatSource 是引用 chip + 悬停预览，
   ChatSources 是 Disclosure + maxVisible 与 "+N more"；ChatTool 是
   子路径导入（依赖 shiki），状态五态，Group 归组连续工具调用；
   CodeBlock 子路径导入（shiki），Header 语言 + CopyButton；
   Loader 14 变体、sm/md/lg 16/20/24px、五色、role=status；
   Markdown 子路径导入（streamdown/react-markdown/marked），分块
   memo，Streamdown 另做流式修复与光标；ModelSelector 是 Select
   扩展，模型各有 efforts（tone max/ultra），切换模型用
   defaultEffort、切回恢复用户 level，Effort 是 Slider；
   PromptInput 是 composer（Shell/Content/Attachments/TextArea/
   Toolbar/Send，Queue 可重排，TokenInput 是 RAC TokenField alpha，
   @ 提及菜单锚在光标处）；PromptSuggestion 是 pill/card 两态；
   Reasoning 是 Disclosure，status streaming/complete/stopped/error，
   autoExpand、collapseDelay 默认 1000（Infinity 永不收）；
   TextShimmer 是 45% 底字 + 扫过的高光（--spread 4ch，减弱动态时
   实色）。本实现只用免费组件 + 手写，shiki / streamdown /
   react-markdown 列在报告待批清单（Markdown 与 CodeBlock 的高亮
   用手写小分词器，不冒充 shiki）。 */

function TextShimmerView({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block overflow-hidden ${className}`} aria-label={typeof children === "string" ? children : undefined}>
      <span aria-hidden="true" className="opacity-45">{children}</span>
      <span aria-hidden="true" className="animate-[shimmer-sweep_2s_linear_infinite] absolute inset-0 bg-[linear-gradient(100deg,transparent_20%,currentColor_50%,transparent_80%)] bg-clip-text text-transparent" style={{ backgroundSize: "200% 100%" }}>{children}</span>
      <style>{`@keyframes shimmer-sweep { from { background-position: 200% 0; } to { background-position: -200% 0; } } @media (prefers-reduced-motion: reduce) { .animate-\\[shimmer-sweep_2s_linear_infinite\\] { animation: none !important; } }`}</style>
    </span>
  );
}

export type CodeTokenKind = "comment" | "string" | "keyword" | "number";
/** 代码 token 配色（D-3）：浅色语法色沿用浅色值，深色态改用浅紫/浅绿/浅琥珀
 * （紫 #7c3aed → #c4b5fd 7.92、绿 #059669 → #6ee7b7 9.60、琥珀 #d97706 → #fcd34d
 * 10.15，均对深色代码底 #1e293b，修前紫只有 2.72）。单测见 ComponentLibraryPage.test.ts。 */
export function codeTokenClass(kind: CodeTokenKind): string {
  return kind === "comment" ? "text-[var(--dim)] italic" : kind === "string" ? "text-[#059669] dark:text-[#6ee7b7]" : kind === "keyword" ? "text-[#7c3aed] dark:text-[#c4b5fd]" : "text-[#d97706] dark:text-[#fcd34d]";
}

function tokenizeCode(code: string): ReactNode[] {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|for|while|import|from|export|type|interface|new|await|async)\b|(\b\d+(?:\.\d+)?\b)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const cls = m[1] ? codeTokenClass("comment") : m[2] ? codeTokenClass("string") : m[3] ? codeTokenClass("keyword") : codeTokenClass("number");
    out.push(<span key={k++} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

function CodeBlockView({ code, language = "typescript" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { /* 剪贴板不可用时仍给反馈 */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5">
        <span className="text-xs font-medium text-[var(--dim)]">{language}</span>
        <Button size="sm" variant="ghost" aria-label="复制代码" onClick={copy}>{copied ? "✓ 已复制" : "复制"}</Button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-5"><code>{tokenizeCode(code)}</code></pre>
    </div>
  );
}

const MD_SAMPLE = `## 处置建议\n\n针对这条 **9.8 分**广告，建议 *删除消息* 并禁言 24 小时：\n\n- 命中规则：\`ad-link\`（短链 + 联系方式）\n- 模型：gemini-decision-1，置信度 0.99\n\n> 人工复核时看原消息与判定证据，不要只看分数。\n\n\`\`\`typescript\nconst action = decide(item); // 'delete' | 'mute' | 'allow'\n\`\`\``;

function MiniMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => text.split(/\n{2,}/), [text]);
  const renderInline = (s: string, keyPrefix: string): ReactNode[] => {
    const parts = s.split(/(`[^`]+`|\*\*[^*]+\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
    return parts.map((p, i) => {
      if (p.startsWith("`") && p.endsWith("`")) return <code key={`${keyPrefix}-${i}`} className="rounded bg-[var(--surface-3)] px-1 font-mono text-xs">{p.slice(1, -1)}</code>;
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${keyPrefix}-${i}`}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("*") && p.endsWith("*")) return <em key={`${keyPrefix}-${i}`}>{p.slice(1, -1)}</em>;
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
      if (link) return <a key={`${keyPrefix}-${i}`} href={link[2]} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline underline-offset-2">{link[1]}</a>;
      return <span key={`${keyPrefix}-${i}`}>{p}</span>;
    });
  };
  return (
    <div className="space-y-2 text-sm leading-6">
      {blocks.map((b, bi) => {
        const t = b.trim();
        if (!t) return null;
        if (t.startsWith("```")) {
          const lines = t.split("\n");
          const lang = (lines[0] ?? "").slice(3).trim() || "plaintext";
          const code = lines.slice(1, lines[lines.length - 1] === "" ? -1 : undefined).join("\n").replace(/```$/, "");
          return <CodeBlockView key={bi} code={code} language={lang} />;
        }
        if (t.startsWith("### ")) return <h3 key={bi} className="text-sm font-bold">{renderInline(t.slice(4), `b${bi}`)}</h3>;
        if (t.startsWith("## ")) return <h2 key={bi} className="text-base font-bold">{renderInline(t.slice(3), `b${bi}`)}</h2>;
        if (t.startsWith("# ")) return <h1 key={bi} className="text-lg font-bold">{renderInline(t.slice(2), `b${bi}`)}</h1>;
        if (t.startsWith("> ")) return <blockquote key={bi} className="border-l-2 border-[var(--border-strong)] pl-3 text-[var(--dim)]">{renderInline(t.slice(2), `b${bi}`)}</blockquote>;
        if (t.split("\n").every((l) => l.startsWith("- "))) return <ul key={bi} className="list-disc space-y-1 pl-5">{t.split("\n").map((l, i) => <li key={i}>{renderInline(l.slice(2), `b${bi}l${i}`)}</li>)}</ul>;
        return <p key={bi}>{renderInline(t, `b${bi}`)}</p>;
      })}
    </div>
  );
}

const LOADER_VARIANTS = ["ring", "classic", "dots", "pulse", "scan", "grid", "wave", "sparkle", "atom", "morph", "helix", "twist", "shuffle", "infinity"] as const;
type LoaderVariant = (typeof LOADER_VARIANTS)[number];
export type LoaderColor = "accent" | "current" | "success" | "warning" | "danger";
/** Loader 配色（D-4）：accent 原来写死浅色 #0e7490，深色态 sparkle ✦ 只有 3.24；
 * 改走 var(--accent)——浅色仍解析为 #0e7490（渲染不变），深色解析为 #22d3ee
 *（对深底约 9.6）。其余四色仍为原写死值。单测见 ComponentLibraryPage.test.ts。 */
export function loaderColorValue(color: LoaderColor): string {
  return color === "current" ? "currentColor" : color === "success" ? "#059669" : color === "warning" ? "#d97706" : color === "danger" ? "#dc2626" : "var(--accent)";
}

function LoaderView({ variant = "ring", size = "md", color = "accent", label }: { variant?: LoaderVariant; size?: "sm" | "md" | "lg"; color?: LoaderColor; label?: string }) {
  const px = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  const col = loaderColorValue(color);
  const colSoft = color === "accent" ? "color-mix(in srgb, var(--accent) 20%, transparent)" : `${col}33`;
  const common = { width: px, height: px, color: col } as CSSProperties;
  let drawing: ReactNode = null;
  if (variant === "ring") drawing = <svg style={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="origin-center animate-spin" /></svg>;
  else if (variant === "classic") drawing = <span aria-hidden="true" className="inline-block animate-spin rounded-full border-2 border-solid" style={{ width: px, height: px, borderColor: colSoft, borderTopColor: col }} />;
  else if (variant === "dots") drawing = <span aria-hidden="true" className="inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="inline-block animate-bounce rounded-full" style={{ width: px / 3, height: px / 3, background: col, animationDelay: `${i * 0.15}s` }} />)}</span>;
  else if (variant === "pulse") drawing = <span aria-hidden="true" className="inline-block animate-ping rounded-full" style={{ width: px, height: px, background: col }} />;
  else if (variant === "scan") drawing = <span aria-hidden="true" className="relative inline-block overflow-hidden rounded-sm border" style={{ width: px * 1.5, height: px, borderColor: col }}><span className="absolute inset-y-0 w-1/3 animate-[loader-scan_1.2s_ease-in-out_infinite] bg-current" style={{ color: col }} /></span>;
  else if (variant === "grid") drawing = <span aria-hidden="true" className="inline-grid grid-cols-3 gap-0.5">{Array.from({ length: 9 }, (_, i) => <span key={i} className="animate-pulse rounded-[1px]" style={{ width: px / 4, height: px / 4, background: col, animationDelay: `${(i % 3) * 0.15 + Math.floor(i / 3) * 0.1}s` }} />)}</span>;
  else if (variant === "wave") drawing = <span aria-hidden="true" className="inline-flex items-end gap-0.5" style={{ height: px }}>{[0, 1, 2, 3, 4].map((i) => <span key={i} className="inline-block animate-[loader-wave_1s_ease-in-out_infinite] rounded-full" style={{ width: 3, height: px * 0.6, background: col, animationDelay: `${i * 0.12}s` }} />)}</span>;
  else if (variant === "sparkle") drawing = <span aria-hidden="true" className="inline-block animate-[loader-twist_1.4s_linear_infinite] text-lg leading-none" style={{ color: col, fontSize: px }}>✦</span>;
  else if (variant === "atom") drawing = <svg style={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="2" fill="currentColor" /><ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.5" className="origin-center animate-spin" /><ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.5" className="origin-center animate-spin" style={{ transform: "rotate(60deg)", animationDuration: "1.6s" }} /></svg>;
  else if (variant === "morph") drawing = <span aria-hidden="true" className="inline-block animate-[loader-morph_2s_ease-in-out_infinite]" style={{ width: px, height: px, background: col }} />;
  else if (variant === "helix") drawing = <span aria-hidden="true" className="inline-flex flex-col gap-1">{[0, 1, 2].map((r) => <span key={r} className="flex gap-1">{[0, 1, 2, 3].map((i) => <span className="inline-block animate-pulse rounded-full" style={{ width: px / 5, height: px / 5, background: col, animationDelay: `${((i + r) % 4) * 0.15}s` }} />)}</span>)}</span>;
  else if (variant === "twist") drawing = <span aria-hidden="true" className="inline-block animate-[loader-twist_1.2s_linear_infinite]">{[0, 1, 2].map((i) => <span key={i} className="mx-px inline-block rounded-sm" style={{ width: 3, height: px, background: col, transform: `rotate(${i * 30}deg)` }} />)}</span>;
  else if (variant === "shuffle") drawing = <span aria-hidden="true" className="relative inline-block" style={{ width: px * 1.5, height: px }}>{[0, 1, 2].map((i) => <span key={i} className="absolute top-1/2 h-2 w-2 -translate-y-1/2 animate-[loader-shuffle_1.2s_ease-in-out_infinite] rounded-sm" style={{ background: col, animationDelay: `${i * 0.2}s`, left: 0 }} />)}</span>;
  else drawing = <svg style={{ ...common, width: px * 1.5 }} viewBox="0 0 36 24" fill="none" aria-hidden="true"><path d="M18 12c-3-5-8-8-11-5s-2 8 1 9 8-1 10-4 3-8 6-8 6 3 3 6-5 5-9 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-[loader-dash_1.6s_linear_infinite]" strokeDasharray="60 20" /></svg>;
  return (
    <span role="status" aria-label={label ?? "Loading"} className="inline-flex items-center gap-2">
      {drawing}
      {label && <span className="text-sm text-[var(--dim)]">{label}</span>}
      <style>{`@keyframes loader-scan { 0%,100% { left: 0; } 50% { left: 66%; } } @keyframes loader-wave { 0%,100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } } @keyframes loader-twist { to { transform: rotate(360deg); } } @keyframes loader-morph { 0%,100% { border-radius: 50%; } 50% { border-radius: 12%; transform: rotate(90deg) scale(.85); } } @keyframes loader-shuffle { 0% { transform: translate(0,-50%); } 50% { transform: translate(22px,-50%); } 100% { transform: translate(0,-50%); } } @keyframes loader-dash { to { stroke-dashoffset: -80; } }`}</style>
    </span>
  );
}

type CoTStep = { title: string; desc?: string; status: "complete" | "active" | "pending" | "error" };
function ChainOfThoughtView({ steps, status = "complete" }: { steps: CoTStep[]; status?: "streaming" | "complete" | "stopped" | "error" }) {
  return (
    <ol className="space-y-0" data-status={status}>
      {steps.map((s, i) => {
        const display = status === "stopped" || status === "error" ? (s.status === "active" ? "interrupted" : s.status) : s.status;
        return (
          <li key={s.title} data-status={display} className="flex gap-2.5" aria-current={display === "active" ? "step" : undefined}>
            <span className="flex w-5 flex-col items-center" aria-hidden="true">
              <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${display === "complete" ? "bg-[var(--accent)] text-white " + LIB_DARK_ACCENT_FIX_CLASS : display === "error" ? "bg-[var(--danger)] text-white " + LIB_DARK_DANGER_FIX_CLASS : display === "active" ? "text-[var(--accent)]" : "bg-[var(--surface-3)] text-[var(--dim)]"}`}>
                {display === "complete" ? "✓" : display === "error" ? "✕" : display === "active" ? <LoaderView variant="ring" size="sm" /> : "•"}
              </span>
              {i < steps.length - 1 && <span className={`w-px flex-1 ${display === "pending" || display === "active" ? "border-l border-dashed border-[var(--border-strong)]" : "bg-[var(--border-strong)]"}`} />}
            </span>
            <span className="pb-3">
              <span className="block text-[13px] font-medium">{s.title}</span>
              {s.desc && <span className="block text-xs text-[var(--dim)]">{s.desc}</span>}
              <span className="sr-only">{display === "complete" ? "Completed" : display === "active" ? "In progress" : display === "pending" ? "Not started" : display === "error" ? "Failed" : "Didn't finish"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ReasoningView({ status, duration, text, steps, collapseDelay = 1000 }: { status: "streaming" | "complete" | "stopped" | "error"; duration?: string; text: string; steps: CoTStep[]; collapseDelay?: number }) {
  const [expanded, setExpanded] = useState(status === "streaming");
  const userToggled = useRef(false);
  useEffect(() => {
    if (status === "streaming") { setExpanded(true); return; }
    if (status !== "complete") return;
    if (collapseDelay === Infinity) return;
    const t = window.setTimeout(() => { if (!userToggled.current) setExpanded(false); }, collapseDelay);
    return () => window.clearTimeout(t);
  }, [status, collapseDelay]);
  const label = status === "streaming" ? <TextShimmerView>Thinking…</TextShimmerView> : status === "error" ? "Couldn't finish thinking" : status === "stopped" ? (duration ? `Stopped after ${duration}` : "Stopped thinking") : duration ? `Thought for ${duration}` : "Thought for a few seconds";
  return (
    <Disclosure isExpanded={expanded} onExpandedChange={(v) => { userToggled.current = true; setExpanded(v); }}>
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex items-center gap-2 rounded-lg px-1 py-1 text-left text-[13px] text-[var(--dim)] hover:bg-[var(--surface-3)]">
          {status === "streaming" && <LoaderView variant="grid" size="sm" />}
          <span>{label}</span>
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="pl-1 pt-1">
          <div aria-busy={status === "streaming"}>
            <p className="whitespace-pre-wrap text-[13px] leading-6 text-[var(--dim)]">{text}</p>
            <div className="mt-2"><ChainOfThoughtView steps={steps} status={status} /></div>
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

type ApprovalQuestion = { id: string; title: string; multiSelect?: boolean; options?: { id: string; label: string; description?: string }[]; allowCustom?: boolean; allowSkip?: boolean };
function ApprovalCardView({ questions, onSubmit }: { questions: ApprovalQuestion[]; onSubmit: (r: { answers: Record<string, string[]>; skipped: string[] }) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [done, setDone] = useState<{ answers: Record<string, string[]>; skipped: string[] } | null>(null);
  const q = questions[step] ?? questions[0]!;
  const isLast = step === questions.length - 1;
  const sel = answers[q.id] ?? [];
  const canContinue = q.options ? sel.length > 0 || (custom[q.id]?.trim() ?? "") !== "" : true;
  const submitStep = (skip: boolean) => {
    const nextAnswers = { ...answers };
    if (skip) { setSkipped((s) => [...s, q.id]); }
    else if (custom[q.id]?.trim()) { nextAnswers[q.id] = [...sel, `自定义：${custom[q.id]!.trim()}`]; setAnswers(nextAnswers); }
    if (!isLast) { setStep(step + 1); return; }
    const result = { answers: nextAnswers, skipped: skip ? [...skipped, q.id] : skipped };
    setDone(result);
    onSubmit(result);
  };
  if (done) {
    return (
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
        <p className="font-semibold">✓ 审批已提交</p>
        <p className="text-[var(--dim)]">已答 {Object.keys(done.answers).length} 题 · 跳过 {done.skipped.length} 题{done.skipped.length > 0 ? `（${done.skipped.join("、")}）` : ""}。</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => { setStep(0); setAnswers({}); setCustom({}); setSkipped([]); setDone(null); }}>重新审批</Button>
      </div>
    );
  }
  const visibleDots = questions.slice(Math.max(0, Math.min(step - 3, questions.length - 7)), Math.max(0, Math.min(step - 3, questions.length - 7)) + 7);
  return (
    <div className="max-w-md rounded-xl border-0 bg-[var(--surface)] shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between border-b border-[var(--border)] px-4 py-3">
        <h4 className="text-sm font-semibold">{q.title}</h4>
        <Button size="sm" variant="ghost" aria-label="关闭审批" onClick={() => onSubmit({ answers, skipped: [...skipped, q.id] })}>✕</Button>
      </div>
      <div className="px-4 py-3">
        {q.options && q.options.length > 0 && (
          q.multiSelect ? (
            <HeroCheckboxGroup value={sel} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: [...v] }))} aria-label={q.title} className="space-y-1">
              {q.options.map((o) => (
                <HeroCheckbox key={o.id} value={o.id} className="rounded-lg px-2 py-1.5 hover:bg-[var(--surface-3)] data-[selected=true]:bg-[var(--accent-bg)] data-[selected=true]:ring-1 data-[selected=true]:ring-[var(--accent)]">
                  <HeroCheckbox.Content className="items-start gap-2">
                    <HeroCheckbox.Control><HeroCheckbox.Indicator /></HeroCheckbox.Control>
                    <span><span className="block text-[13px] font-medium">{o.label}</span>{o.description && <span className="block text-xs text-[var(--dim)]">{o.description}</span>}</span>
                  </HeroCheckbox.Content>
                </HeroCheckbox>
              ))}
            </HeroCheckboxGroup>
          ) : (
            <RadioGroup value={sel[0] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: [v] }))} aria-label={q.title} className="space-y-1">
              {q.options.map((o) => (
                <Radio key={o.id} value={o.id} className="rounded-lg px-2 py-1.5 hover:bg-[var(--surface-3)] data-[selected=true]:bg-[var(--accent-bg)] data-[selected=true]:ring-1 data-[selected=true]:ring-[var(--accent)]">
                  <Radio.Content className="items-start gap-2">
                    <Radio.Control><Radio.Indicator /></Radio.Control>
                    <span><span className="block text-[13px] font-medium">{o.label}</span>{o.description && <span className="block text-xs text-[var(--dim)]">{o.description}</span>}</span>
                  </Radio.Content>
                </Radio>
              ))}
            </RadioGroup>
          )
        )}
        {q.allowCustom && (
          <Input aria-label="其他回答" placeholder="Something else…" value={custom[q.id] ?? ""} onChange={(e) => setCustom((c) => ({ ...c, [q.id]: e.target.value }))} className="mt-2" />
        )}
        {!q.options && <p className="text-[13px] leading-6 text-[var(--dim)]">这是一道确认题：没有选项，点“继续”即同意执行，点“跳过”即拒绝。</p>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
        <span className="flex items-center gap-2">
          {questions.length > 1 && (
            <span className="flex items-center gap-1.5" aria-label={`第 ${step + 1} 题，共 ${questions.length} 题`}>
              {visibleDots.map((dq, i) => {
                const idx = questions.indexOf(dq);
                const answered = answers[dq.id] !== undefined || skipped.includes(dq.id);
                return <span key={dq.id} aria-hidden="true" className={`h-1.5 rounded-full ${idx === step ? "w-5 bg-[var(--accent)]" : answered ? "w-1.5 bg-[var(--dim)]" : "w-1.5 bg-[var(--border-strong)]"}`} style={{ opacity: i === 0 || i === visibleDots.length - 1 ? 0.6 : 1 }} />;
              })}
            </span>
          )}
          <span className="text-xs text-[var(--dim)]" aria-live="polite">{step + 1}/{questions.length}</span>
          {isLast && skipped.length > 0 && <span className="text-xs text-[var(--dim)]">{skipped.length} skipped</span>}
        </span>
        <span className="flex gap-2">
          {q.allowSkip !== false && <Button size="sm" variant="ghost" onClick={() => submitStep(true)}>跳过 <kbd className="ml-1 rounded border border-[var(--border)] bg-[var(--surface-3)] px-1 py-0.5 text-[10px]">S</kbd></Button>}
          <Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} style={{ height: 40, fontSize: 15, borderRadius: 12 }} disabled={!canContinue && !isLast} onClick={() => submitStep(false)}>{isLast ? "发送" : "继续"} <kbd className="ml-1 rounded border border-[var(--border)] bg-[var(--surface-3)] px-1 py-0.5 text-[10px] text-[var(--text)]">↵</kbd></Button>
        </span>
      </div>
    </div>
  );
}

type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error" | "requires-action";
function ChatToolView({ toolName, state, input, output, errorText, onApprove, onReject, defaultExpanded = false }: { toolName: string; state: ToolState; input?: unknown; output?: unknown; errorText?: string; onApprove?: () => void; onReject?: () => void; defaultExpanded?: boolean }) {
  const [open, setOpen] = useState(defaultExpanded);
  const icon = state === "output-available" ? "✓" : state === "output-error" ? "✕" : state === "requires-action" ? "!" : "…";
  const iconCls = state === "output-available" ? "bg-[var(--accent)] text-white " + LIB_DARK_ACCENT_FIX_CLASS : state === "output-error" ? "bg-[var(--danger)] text-white " + LIB_DARK_DANGER_FIX_CLASS : state === "requires-action" ? "bg-[#b45309] text-white" : "bg-[var(--surface-3)] text-[var(--dim)]";
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]" data-state={state}>
      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${iconCls}`}>{state === "input-streaming" ? <LoaderView variant="ring" size="sm" /> : icon}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {state === "input-streaming" || state === "input-available" ? <TextShimmerView>调用 {toolName}…</TextShimmerView> : <><span className="font-mono text-xs">{toolName}</span> · {state === "output-available" ? "已完成" : state === "output-error" ? "失败" : "需要确认"}</>}
        </span>
        <Icon name="chevron" size={14} className={`text-[var(--dim)] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-[var(--border)] px-3 py-2.5">
          {input !== undefined && <div><p className="text-[11px] font-medium text-[var(--dim)]">Input</p><pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-[var(--surface-3)] p-2 font-mono text-[11px] leading-5">{JSON.stringify(input, null, 2)}</pre></div>}
          {output !== undefined && <div><p className="text-[11px] font-medium text-[var(--dim)]">Result</p><pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-[var(--surface-3)] p-2 font-mono text-[11px] leading-5">{JSON.stringify(output, null, 2)}</pre></div>}
          {errorText && <div><p className="text-[11px] font-medium text-[var(--danger)]">Error</p><p className="mt-1 text-xs leading-5 text-[var(--danger)]">{errorText}</p></div>}
          {state === "requires-action" && (
            <div className="flex gap-2">
              <Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} onClick={onApprove}>批准执行</Button>
              <Button size="sm" variant="secondary" onClick={onReject}>拒绝</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ChatToolGroupView({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-2">
      <button type="button" className="flex w-full items-center gap-2 px-1 py-1 text-left text-[13px] font-medium" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="chevron" size={14} className={`text-[var(--dim)] transition-transform ${open ? "rotate-90" : ""}`} />{title}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

type SourceItem = { href?: string; title: string; description?: string };
function ChatSourceChip({ s }: { s: SourceItem }) {
  const [preview, setPreview] = useState(false);
  const domain = s.href ? new URL(s.href).hostname : "文档";
  const inner = (
    <>
      <span className="flex h-4 w-4 items-center justify-center rounded bg-[var(--surface-3)] text-[10px] font-bold">{(s.title[0] ?? "?").toUpperCase()}</span>
      <span className="truncate">{s.title}</span>
    </>
  );
  const cls = "relative inline-flex max-w-44 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs";
  return (
    <span className={cls} onMouseEnter={() => setPreview(true)} onMouseLeave={() => setPreview(false)}>
      {s.href ? <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">{inner}</a> : <span className="inline-flex items-center gap-1.5">{inner}</span>}
      {preview && s.description && (
        <span className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-xl">
          <span className="flex items-center gap-2 text-xs font-medium"><span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--surface-3)] text-[10px] font-bold">{(s.title[0] ?? "?").toUpperCase()}</span>{domain}</span>
          <span className="mt-1 block text-xs font-semibold">{s.title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-[var(--dim)]">{s.description}</span>
        </span>
      )}
    </span>
  );
}
function ChatSourcesView({ sources, maxVisible = 3 }: { sources: SourceItem[]; maxVisible?: number }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? sources : sources.slice(0, maxVisible);
  const hidden = sources.length - shown.length;
  return (
    <div>
      <button type="button" className="flex items-center gap-1.5 text-xs font-medium text-[var(--dim)] hover:text-[var(--text)]" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="flex -space-x-1">{sources.slice(0, 3).map((s, i) => <span key={i} className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--surface-3)] text-[9px] font-bold ring-1 ring-[var(--surface)]">{(s.title[0] ?? "?").toUpperCase()}</span>)}</span>
        {sources.length} 个来源 <Icon name="chevron" size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {shown.map((s) => <ChatSourceChip key={s.title} s={s} />)}
          {hidden > 0 && <button type="button" className="rounded-full border border-[var(--border)] px-2 py-1 text-xs" aria-expanded={showAll} onClick={() => setShowAll(true)}>+{hidden} more</button>}
          {showAll && <button type="button" className="rounded-full border border-[var(--border)] px-2 py-1 text-xs" onClick={() => setShowAll(false)}>Show less</button>}
        </div>
      )}
    </div>
  );
}

type AiModel = { id: string; name: string; shortName: string; provider: string; badge?: string; description: string; intelligence: number; speed: number; contextWindow: number; efforts: { id: string; label: string; description?: string; tone?: "max" | "ultra" }[]; defaultEffort: string; isDisabled?: boolean };
const AI_MODELS: AiModel[] = [
  { id: "gemini", name: "Gemini 3 Pro", shortName: "Gemini 3", provider: "Google", badge: "New", description: "判定与长文复核的主力，置信度稳定。", intelligence: 5, speed: 4, contextWindow: 1_000_000, efforts: [{ id: "low", label: "Low" }, { id: "medium", label: "Medium", description: "平衡速度与质量。" }, { id: "high", label: "High", tone: "max", description: "Max, Uses your limit faster." }, { id: "ultra", label: "Ultra", tone: "ultra", description: "Ultra uses your limit fastest." }], defaultEffort: "medium" },
  { id: "opus", name: "Claude Opus 5.5", shortName: "Opus 5.5", provider: "Anthropic", description: "最强推理，适合复杂申诉复核。", intelligence: 5, speed: 3, contextWindow: 200_000, efforts: [{ id: "low", label: "Low" }, { id: "medium", label: "Medium" }, { id: "high", label: "High", tone: "max" }], defaultEffort: "medium" },
  { id: "sonnet", name: "Claude Sonnet 4.5", shortName: "Sonnet 4.5", provider: "Anthropic", description: "日常处置又快又稳。", intelligence: 4, speed: 5, contextWindow: 200_000, efforts: [{ id: "low", label: "Low" }, { id: "high", label: "High", tone: "max" }], defaultEffort: "low" },
  { id: "gpt", name: "GPT-5.2", shortName: "GPT-5.2", provider: "OpenAI", description: "通用对话与摘要。", intelligence: 4, speed: 4, contextWindow: 400_000, efforts: [{ id: "low", label: "Low" }], defaultEffort: "low", isDisabled: true },
];
/** J-M1：模型行厂商色 soft 底 + 图标槽。Google 青系、Anthropic 紫系、
 * OpenAI 琥珀系；字母保留并加粗。 */
export function modelVendorTone(provider: string): string {
  if (provider === "Google") return "bg-[var(--accent-bg)] text-[var(--accent-strong)]";
  if (provider === "Anthropic") return "bg-[var(--violet-bg)] text-[var(--violet-strong)]";
  return "bg-[var(--warn-bg)] text-[var(--warn)]";
}

function ModelSelectorView({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<AiModel | null>(null);
  const [effortByModel, setEffortByModel] = useState<Record<string, string>>({});
  const model = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0]!;
  const effortId = effortByModel[model.id] ?? model.defaultEffort;
  const effortIdx = Math.max(0, model.efforts.findIndex((e) => e.id === effortId));
  const effort = model.efforts[effortIdx] ?? model.efforts[0]!;
  const q = query.trim().toLowerCase();
  const filtered = AI_MODELS.filter((m) => !q || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
  const groups = [...new Set(filtered.map((m) => m.provider))];
  const pick = (id: string) => { onChange(id); setOpen(false); setQuery(""); };
  const setEffort = (idx: number) => {
    const e = model.efforts[clamp(idx, 0, model.efforts.length - 1)];
    if (e) setEffortByModel((prev) => ({ ...prev, [model.id]: e.id }));
  };
  const dots = (v: number, max = 5) => Array.from({ length: max }, (_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < v ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`} />);
  return (
    <Popover isOpen={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <Popover.Trigger>
        <HeroButton variant="ghost" size="sm" aria-label={`模型：${model.name}`} className="gap-1.5 text-xs font-medium">
          <span className={`flex h-5 w-5 items-center justify-center rounded ${modelVendorTone(model.provider)} text-[10px] font-bold`}>{model.shortName[0]}</span>
          {model.shortName} <Icon name="chevron" size={12} className={open ? "rotate-180" : ""} />
        </HeroButton>
      </Popover.Trigger>
      <Popover.Content placement="top end" className="w-[480px] max-w-[92vw]">
        <Popover.Dialog className="flex gap-3 p-3">
          <div className="min-w-0 flex-1">
            <SearchField aria-label="搜索模型" value={query} onChange={setQuery} autoFocus>
              <SearchField.Group className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2">
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="搜索模型或厂商…" className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <p className="px-1 pb-1 pt-2 text-[11px] font-medium text-[var(--dim)]">Models</p>
            <ListBox aria-label="模型列表" className="max-h-64 overflow-y-auto" onAction={(k) => pick(String(k))}>
              {filtered.length === 0 && <ListBox.Item id="__empty" textValue="无匹配" isDisabled className="px-2 py-4 text-center text-xs text-[var(--dim)]">没有匹配“{query}”的模型。</ListBox.Item>}
              {groups.map((g) => (
                <ListBox.Section key={g} aria-label={g}>
                  <ListBox.Item id={`__h-${g}`} textValue={g} isDisabled className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--dim)]">{g}</ListBox.Item>
                  {filtered.filter((m) => m.provider === g).map((m) => (
                    <ListBox.Item key={m.id} id={m.id} textValue={m.name} isDisabled={m.isDisabled} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm" onMouseEnter={() => setHovered(m)} onFocus={() => setHovered(m)}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${modelVendorTone(m.provider)} text-[11px] font-bold`}>{m.shortName[0]}</span>
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      {m.badge && <HeroChip size="sm" variant="soft">{m.badge}</HeroChip>}
                      {m.id === value && <span aria-hidden="true" className="text-[var(--accent)]">✓</span>}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              ))}
            </ListBox>
            {model.efforts.length >= 2 && (
              <div className="mt-2 border-t border-[var(--border)] pt-2">
                <div className="flex items-center justify-between text-xs"><span className="font-medium">Effort</span><span className="text-[var(--dim)]">{effort.label}</span></div>
                <Slider label="Effort" value={effortIdx} onChange={setEffort} minValue={0} maxValue={model.efforts.length - 1} step={1} className="mt-1" />
                <div className="flex justify-between text-[11px] text-[var(--dim)]"><span>Faster</span><span>Smarter</span></div>
                {effort.description && <p className="mt-1 text-xs leading-5 text-[var(--dim)]">{effort.description}</p>}
                {effort.tone === "ultra" && <p className="mt-1 text-xs font-medium text-[var(--accent)]">Ultra 档：滑块带辉光与粒子（本实现用 accent 光晕示意）。</p>}
              </div>
            )}
          </div>
          {(hovered ?? model) && (
            <div className="hidden w-44 shrink-0 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:block">
              <p className="flex items-center gap-2 text-[15px] font-semibold"><span className={`flex h-6 w-6 items-center justify-center rounded-md ${modelVendorTone((hovered ?? model).provider)} text-[11px] font-bold`}>{(hovered ?? model).shortName[0]}</span>{(hovered ?? model).name}</p>
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--dim)]">{(hovered ?? model).description}</p>
              <p className="mt-2 flex items-center justify-between text-xs"><span>Intelligence</span><span className="flex gap-0.5">{dots((hovered ?? model).intelligence)}</span></p>
              <p className="mt-1 flex items-center justify-between text-xs"><span>Speed</span><span className="flex gap-0.5">{dots((hovered ?? model).speed)}</span></p>
              <p className="mt-1 text-xs text-[var(--dim)]">{fmtInt((hovered ?? model).contextWindow)} context window</p>
            </div>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

type AttachFile = { id: number; name: string; size: number; mime: string; src?: string };
function AttachmentChips({ files, onRemove }: { files: AttachFile[]; onRemove: (id: number) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f) => {
        const isMedia = f.mime.startsWith("image/") || f.mime.startsWith("video/");
        return (
          <span key={f.id} data-variant={isMedia ? "media" : "file"} className={isMedia ? "relative block h-16 w-16 overflow-hidden rounded-lg border border-[var(--border)]" : "flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2"}>
            {isMedia && f.src ? <img src={f.src} alt={f.name} className="h-full w-full object-cover" /> : isMedia ? <span className="flex h-full w-full items-center justify-center text-[var(--dim)]"><FileSvg size={20} /></span> : <><FileSvg size={16} className="shrink-0 text-[var(--dim)]" /><span><span className="block max-w-32 truncate text-xs font-medium">{f.name}</span><span className="block text-[11px] text-[var(--dim)]">{fmtBytes(f.size)}</span></span></>}
            <button type="button" aria-label={`移除附件 ${f.name}`} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white" onClick={() => onRemove(f.id)}>✕</button>
          </span>
        );
      })}
    </div>
  );
}

type ChatThread = { id: string; title: string; preview: string; meta: string };
const CHAT_THREADS: ChatThread[] = [
  { id: "t1", title: "9.8 分广告怎么处置", preview: "删除并禁言 24 小时", meta: "2 分钟前" },
  { id: "t2", title: "新人验证超时策略", preview: "重发 2 次后转人工", meta: "1 小时前" },
  { id: "t3", title: "周报数据怎么看", preview: "7 日趋势与分类统计", meta: "昨天" },
];
function ThreadsList({ active, onPick, density }: { active: string; onPick: (id: string) => void; density: "comfortable" | "compact" }) {
  return (
    <ListBox aria-label="最近会话" selectionMode="single" selectedKeys={new Set([active])} onSelectionChange={(k) => { const v = [...(k === "all" ? [] : k)][0]; if (v) onPick(String(v)); }} className="space-y-0.5">
      {CHAT_THREADS.map((t) => (
        <ListBox.Item key={t.id} id={t.id} textValue={t.title} className={`flex items-center gap-2 rounded-lg px-2 ${density === "compact" ? "py-1" : "py-2"} hover:bg-[var(--surface-3)] data-[selected=true]:bg-[var(--accent-bg)]`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-3)] text-xs font-bold">{t.title[0]}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{t.title}</span>
            {density === "comfortable" && <span className="block truncate text-xs text-[var(--dim)]">{t.preview}</span>}
          </span>
          <span className="shrink-0 text-[11px] text-[var(--dim)]">{t.meta}</span>
        </ListBox.Item>
      ))}
    </ListBox>
  );
}

type AssistantPhase = "idle" | "thinking" | "reasoning" | "tools" | "streaming" | "done" | "stopped";
type Turn = { id: number; userText: string; phase: AssistantPhase; streamed: string; approved: boolean | null; toolError: boolean };
const ASSISTANT_FULL = (prompt: string) => `## 处置建议\n\n针对「${prompt}」，建议 **删除消息** 并禁言 24 小时：\n\n- 命中规则：\`ad-link\`（短链 + 联系方式）\n- 模型置信度 0.99\n\n> 人工复核时看原消息与判定证据，不要只看分数。\n\n\`\`\`typescript\nconst action = decide(item); // 'delete' | 'mute' | 'allow'\n\`\`\``;
const SOURCES: SourceItem[] = [
  { href: "https://heroui.pro/docs/react/components/chat-source", title: "ChatSource 文档", description: "引用 chip 与悬停预览的 Pro 文档。" },
  { href: "https://heroui.pro/docs/react/components/approval-card", title: "ApprovalCard 文档", description: "多步审批卡片的 Pro 文档。" },
  { title: "处置策略 v3（本地文档）", description: "群级处置策略：删除 + 禁言 24 小时。" },
  { title: "13 类分布表", description: "本周广告类命中 38 条，占比最高。" },
];

function AiPlayground() {
  const [thread, setThread] = useState("t1");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [composer, setComposer] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");
  const [model, setModel] = useState("gemini");
  const [layout, setLayout] = useState<"stacked" | "compact" | "inline">("stacked");
  const [files, setFiles] = useState<AttachFile[]>([]);
  const [queue, setQueue] = useState<string[]>(["把这条结论写进处置日志", "给 Ada 发一条复核通知"]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [liked, setLiked] = useState<Record<number, "up" | "down" | null>>({});
  const [copiedMsg, setCopiedMsg] = useState<number | null>(null);
  const convRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const timers = useRef<number[]>([]);
  const fileId = useRef(1);
  const turnId = useRef(1);
  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  useEffect(() => clearTimers, []);
  useEffect(() => {
    const el = convRef.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [turns]);
  const addFiles = useCallback((list: FileList | File[]) => {
    const fresh: AttachFile[] = Array.from(list).map((f) => ({ id: fileId.current++, name: f.name, size: f.size, mime: f.type || "application/octet-stream", src: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined }));
    setFiles((prev) => [...prev, ...fresh]);
  }, []);
  useEffect(() => () => { files.forEach((f) => { if (f.src) URL.revokeObjectURL(f.src); }); }, [files]);
  const removeFile = (id: number) => setFiles((prev) => { const f = prev.find((x) => x.id === id); if (f?.src) URL.revokeObjectURL(f.src); return prev.filter((x) => x.id !== id); });
  const stop = () => {
    clearTimers();
    setStatus("ready");
    setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 && (t.phase === "streaming" || t.phase === "reasoning" || t.phase === "thinking" || t.phase === "tools") ? { ...t, phase: "stopped" as const } : t)));
  };
  const send = (text?: string) => {
    const prompt = (text ?? composer).trim();
    if (!prompt || status !== "ready") return;
    clearTimers();
    const id = turnId.current++;
    setTurns((prev) => [...prev, { id, userText: prompt, phase: "thinking", streamed: "", approved: null, toolError: false }]);
    setComposer("");
    setFiles([]);
    setStatus("submitted");
    timers.current.push(window.setTimeout(() => { setStatus("streaming"); setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, phase: "reasoning" } : t))); }, 700));
    timers.current.push(window.setTimeout(() => setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, phase: "tools" } : t))), 2200));
  };
  const onApproval = (id: number) => (r: { answers: Record<string, string[]>; skipped: string[] }) => {
    const approved = !r.skipped.includes("delete") && (r.answers["delete"]?.[0] === "delete" || Object.keys(r.answers).length === 0);
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, approved, phase: "streaming" } : t)));
    const full = ASSISTANT_FULL(turns.find((t) => t.id === id)?.userText ?? "");
    let i = 0;
    const step = () => {
      i += 3;
      const done = i >= full.length;
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, streamed: full.slice(0, i), phase: done ? "done" : "streaming" } : t)));
      if (done) { setStatus("ready"); return; }
      timers.current.push(window.setTimeout(step, 30));
    };
    timers.current.push(window.setTimeout(step, 300));
  };
  const retry = (id: number) => {
    const t = turns.find((x) => x.id === id);
    if (!t) return;
    setTurns((prev) => prev.map((x) => (x.id === id ? { ...x, phase: "streaming", streamed: "", approved: true } : x)));
    setStatus("streaming");
    const full = ASSISTANT_FULL(t.userText);
    let i = 0;
    const step = () => {
      i += 3;
      const done = i >= full.length;
      setTurns((prev) => prev.map((x) => (x.id === id ? { ...x, streamed: full.slice(0, i), phase: done ? "done" : "streaming" } : x)));
      if (done) { setStatus("ready"); return; }
      timers.current.push(window.setTimeout(step, 30));
    };
    timers.current.push(window.setTimeout(step, 300));
  };
  const copyMsg = async (id: number, text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* 剪贴板不可用时仍给反馈 */ }
    setCopiedMsg(id);
    window.setTimeout(() => setCopiedMsg(null), 1500);
  };
  const mentionQuery = (() => { const m = /@([^\s@]*)$/.exec(composer); return m ? (m[1] ?? "") : null; })();
  const mentionUsers = MOCK_USERS.filter((u) => mentionQuery !== null && u.toLowerCase().includes(mentionQuery.toLowerCase()));
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border)]">
      <div className="flex">
        <div className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface-2)] p-2 md:block">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold">最近会话</p>
            <Segmented value={density} onChange={setDensity} ariaLabel="行密度" options={[{ value: "comfortable", label: "舒适" }, { value: "compact", label: "紧凑" }]} />
          </div>
          <ThreadsList active={thread} onPick={(id) => { setThread(id); setTurns([]); setStatus("ready"); }} density={density} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            ref={convRef}
            role="log" aria-label="对话" aria-busy={status === "streaming"}
            className="relative h-[420px] overflow-y-auto px-4 py-3"
            onScroll={(e) => { const el = e.currentTarget; followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
          >
            {turns.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold">有什么可以帮你？</p>
                <p className="mt-1 text-xs text-[var(--dim)]">从下面的建议开始，或直接输入问题。</p>
              </div>
            )}
            {turns.map((t) => (
              <div key={t.id} className="space-y-3 py-2">
                <div className="flex justify-end">
                  <div className={`max-w-[80%] rounded-2xl rounded-br-md bg-[var(--accent)] px-3.5 py-2 text-sm leading-6 text-white ${LIB_DARK_ACCENT_FIX_CLASS}`}>{t.userText}</div>
                </div>
                <div className="flex gap-2.5">
                  <Avatar name="AI" size={28} />
                  <div className="min-w-0 flex-1 space-y-2">
                    {t.phase === "thinking" && (
                      <div aria-label="正在加载回复"><HeroSkeleton className="h-3 w-3/4" /><HeroSkeleton className="mt-2 h-3 w-1/2" /><HeroSkeleton className="mt-2 h-3 w-2/3" /></div>
                    )}
                    {(t.phase === "reasoning" || t.phase === "tools" || t.phase === "streaming" || t.phase === "done" || t.phase === "stopped") && (
                      <ReasoningView status={t.phase === "reasoning" ? "streaming" : t.phase === "stopped" ? "stopped" : "complete"} duration="4s" text={"先读原消息与判定证据，再调模型复核，最后比对 13 类规则，确认是广告才建议删除。"} steps={[
                        { title: "读取原消息与判定证据", status: "complete" },
                        { title: "调用 gemini-decision-1", status: t.phase === "reasoning" ? "active" : "complete" },
                        { title: "比对 13 类规则", status: t.phase === "reasoning" ? "pending" : "complete" },
                      ]} />
                    )}
                    {(t.phase === "tools" || t.phase === "streaming" || t.phase === "done" || t.phase === "stopped") && (
                      <ChatToolGroupView title="2 个工具调用">
                        <ChatToolView toolName="searchDocs" state="output-available" input={{ query: "ad-link 处置规则" }} output={{ rule: "ad-link", action: "delete + mute 24h" }} defaultExpanded />
                        <ChatToolView toolName="deleteMessage" state={t.approved === null ? "requires-action" : "output-available"} input={{ messageId: 1234 }} output={t.approved === null ? undefined : { deleted: t.approved, muted: true }} defaultExpanded={t.approved === null} />
                      </ChatToolGroupView>
                    )}
                    {t.phase === "tools" && t.approved === null && (
                      <ApprovalCardView
                        questions={[{ id: "delete", title: "删除这条 9.8 分广告并禁言 24 小时？", options: [{ id: "delete", label: "删除并禁言", description: "删消息 + 禁言 24 小时" }, { id: "mute-only", label: "只禁言不删", description: "保留消息作证据" }] }]}
                        onSubmit={onApproval(t.id)}
                      />
                    )}
                    {(t.phase === "streaming" || t.phase === "done" || t.phase === "stopped") && (
                      <div>
                        {t.phase === "streaming" && <p className="mb-1 text-xs"><TextShimmerView>正在生成…</TextShimmerView></p>}
                        <MiniMarkdown text={t.streamed + (t.phase === "streaming" ? "▍" : "")} />
                        {t.phase === "stopped" && <p className="mt-1 text-xs text-[var(--dim)]">已停止生成。</p>}
                      </div>
                    )}
                    {t.phase === "done" && (
                      <>
                        <ChatSourcesView sources={SOURCES} maxVisible={3} />
                        <div className="flex gap-0.5 opacity-100">
                          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="复制回答" onClick={() => copyMsg(t.id, t.streamed)}>{copiedMsg === t.id ? "✓" : "⧉"}</Button></Tooltip.Trigger><Tooltip.Content>复制</Tooltip.Content></Tooltip>
                          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="赞" onClick={() => setLiked((p) => ({ ...p, [t.id]: p[t.id] === "up" ? null : "up" }))}>{liked[t.id] === "up" ? "👍" : "👍︎"}</Button></Tooltip.Trigger><Tooltip.Content>赞</Tooltip.Content></Tooltip>
                          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="踩" onClick={() => setLiked((p) => ({ ...p, [t.id]: p[t.id] === "down" ? null : "down" }))}>{liked[t.id] === "down" ? "👎" : "👎︎"}</Button></Tooltip.Trigger><Tooltip.Content>踩</Tooltip.Content></Tooltip>
                          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="重新生成" onClick={() => retry(t.id)}>↻</Button></Tooltip.Trigger><Tooltip.Content>重新生成</Tooltip.Content></Tooltip>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {status === "submitted" && <div className="flex items-center gap-2 py-2 text-xs text-[var(--dim)]"><LoaderView variant="dots" size="sm" /> 已发送，等待模型…</div>}
          </div>
          <div className="border-t border-[var(--border)] p-3">
            {queue.length > 0 && (
              <div className="mb-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-2">
                <p className="px-1 pb-1 text-[11px] font-medium text-[var(--dim)]">排队中的追问（可拖拽手柄或方向键重排）</p>
                {queue.map((q, i) => (
                  <div key={q} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[13px]">
                    <span className="cursor-grab text-[var(--dim)]" aria-hidden="true">⠿</span>
                    <span className="min-w-0 flex-1 truncate">{q}</span>
                    <Button size="sm" variant="ghost" aria-label={`把“${q}”上移`} onClick={() => setQueue((prev) => { if (i === 0) return prev; const n = [...prev]; const tmp = n[i - 1]!; n[i - 1] = n[i]!; n[i] = tmp; return n; })}>↑</Button>
                    <Button size="sm" variant="ghost" aria-label={`把“${q}”下移`} onClick={() => setQueue((prev) => { if (i === prev.length - 1) return prev; const n = [...prev]; const tmp = n[i + 1]!; n[i + 1] = n[i]!; n[i] = tmp; return n; })}>↓</Button>
                    <Button size="sm" variant="ghost" aria-label={`编辑“${q}”`} onClick={() => { setComposer(q); setQueue((prev) => prev.filter((_, j) => j !== i)); }}>编辑</Button>
                    <Button size="sm" variant="ghost" aria-label={`移除“${q}”`} onClick={() => setQueue((prev) => prev.filter((_, j) => j !== i))}>✕</Button>
                  </div>
                ))}
              </div>
            )}
            <div
              data-drop-target={dragOver ? "true" : undefined}
              className={`rounded-2xl ${dragOver ? "border border-dashed border-[var(--accent)] bg-[var(--accent-bg)]" : "border-0 bg-[var(--surface)] shadow-[var(--shadow-lg)]"} ${layout === "compact" ? "px-2 py-1.5" : "p-2"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            >
              <div className={layout === "inline" ? "flex items-center gap-2" : ""}>
                <div className={layout === "inline" ? "min-w-0 flex-1" : ""}>
                  <AttachmentChips files={files} onRemove={removeFile} />
                  <Textarea aria-label="输入问题" placeholder="问问群里的处置情况…" value={composer} onChange={(e) => { setComposer(e.target.value); setMentionOpen(true); }} onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                    if (e.key === "Escape") setMentionOpen(false);
                  }} rows={layout === "compact" ? 1 : 2} className="!border-0 !py-1.5 shadow-none" />
                  {mentionOpen && mentionQuery !== null && mentionUsers.length > 0 && (
                    <Menu aria-label="@ 提及">
                      {mentionUsers.map((u) => (
                        <Menu.Item key={u} id={u} textValue={u} onAction={() => { setComposer((c) => c.replace(/@[^\s@]*$/, `@${u} `)); setMentionOpen(false); }}>
                          <PhotoAvatar name={u} size={20} /> {u}
                          <Menu.ItemIndicator />
                        </Menu.Item>
                      ))}
                    </Menu>
                  )}
                </div>
                <div className={`flex items-center gap-1 ${layout === "inline" ? "" : "mt-1 justify-between"}`}>
                  <span className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" aria-label="添加附件" onClick={() => document.getElementById("ai-file-input")?.click()}>📎</Button>
                    <input id="ai-file-input" type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
                    <ModelSelectorView value={model} onChange={setModel} />
                  </span>
                  <span className="flex items-center gap-1">
                    <Segmented value={layout} onChange={setLayout} ariaLabel="输入框布局" options={[{ value: "stacked", label: "stacked" }, { value: "compact", label: "compact" }, { value: "inline", label: "inline" }]} />
                    {status === "ready" ? (
                      <Button size="sm" aria-label="发送" className={`shrink-0 ${LIB_DARK_ACCENT_FIX_CLASS}`} style={{ width: 36, height: 36, minHeight: 36, borderRadius: 999, padding: 0 }} onClick={() => send()} disabled={!composer.trim()}>↑</Button>
                    ) : (
                      <Button size="sm" variant="secondary" aria-label="停止生成" onClick={stop}>■ 停止</Button>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--dim)]">AI 生成内容可能有误，处置前请人工复核。Enter 发送，Shift+Enter 换行；@ 唤出提及菜单；拖文件到输入框可添加附件。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiSection() {
  const [demoModel, setDemoModel] = useState("gemini");
  const [attachFiles, setAttachFiles] = useState<AttachFile[]>([]);
  const [threadDensity, setThreadDensity] = useState<"comfortable" | "compact">("comfortable");
  const [activeThread, setActiveThread] = useState("t1");
  const [loaderVariant, setLoaderVariant] = useState<LoaderVariant>("ring");
  const [loaderSize, setLoaderSize] = useState<"sm" | "md" | "lg">("md");
  const [loaderColor, setLoaderColor] = useState<"accent" | "current" | "success" | "warning" | "danger">("accent");
  const [loaderLabel, setLoaderLabel] = useState("Thinking");
  const [mdStreaming, setMdStreaming] = useState(false);
  const [mdShown, setMdShown] = useState(MD_SAMPLE);
  const mdTimer = useRef<number | null>(null);
  const [suggVariant, setSuggVariant] = useState<"pill" | "card">("pill");
  const [suggPicked, setSuggPicked] = useState("");
  const [reasonStatus, setReasonStatus] = useState<"streaming" | "complete" | "stopped" | "error">("complete");
  const [collapseDelay, setCollapseDelay] = useState("1000");
  const [shimmerText, setShimmerText] = useState("Thinking…");
  const [shimmerSpread, setShimmerSpread] = useState(4);
  const [msgLiked, setMsgLiked] = useState<"up" | "down" | null>(null);
  const [msgCopied, setMsgCopied] = useState(false);
  const [miniLogAtBottom, setMiniLogAtBottom] = useState(true);
  const miniLogRef = useRef<HTMLDivElement>(null);
  const [cotStatus, setCotStatus] = useState<"streaming" | "complete" | "stopped" | "error">("complete");
  const [promptMini, setPromptMini] = useState("");
  const [promptStatus, setPromptStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");
  useEffect(() => () => { if (mdTimer.current) window.clearTimeout(mdTimer.current); }, []);
  const replayMd = () => {
    if (mdTimer.current) window.clearTimeout(mdTimer.current);
    setMdStreaming(true);
    setMdShown("");
    let i = 0;
    const step = () => {
      i += 4;
      setMdShown(MD_SAMPLE.slice(0, i));
      if (i < MD_SAMPLE.length) mdTimer.current = window.setTimeout(step, 30);
      else setMdStreaming(false);
    };
    mdTimer.current = window.setTimeout(step, 30);
  };
  const suggGroups = [
    { label: "处置", items: ["这条 9.8 分广告怎么处置？", "刷屏的 12 条消息要全删吗？"] },
    { label: "复核", items: ["帮我复核今天的 3 条误杀", "这条申诉维持原判的理由是什么？"] },
  ];
  return (
    <Section id="ai" title="AI 类（18 件）" desc="上面是一台能跑的迷你 AI 助手：会话列表 + 对话视口 + 推理折叠 + 工具调用 + 审批卡 + 流式 Markdown + 来源引用 + 输入框（含附件、模型选择、排队追问、@提及），全部用 mock 数据在本地跑，不调任何后端接口。下面是 18 件各自的独立条目。">
      <Entry id="ai-playground" name="AI 助手演示场（18 件的组合）" href={PRO("chat-conversation")} status="lib" note="ChatConversation + ChatMessage + Reasoning / ChainOfThought + ChatTool + ApprovalCard + Markdown + CodeBlock + ChatSource + ChatMessageActions + ChatLoader / Loader + TextShimmer + ChatAttachment + ChatListView + ModelSelector + PromptInput + PromptSuggestion 拼成的一台能跑的助手：发一句问题，看它思考、调工具、等你审批、再流式回答。">
        <AiPlayground />
      </Entry>
      <Entry id="approval-card" name="ApprovalCard" href={PRO("approval-card")} status="lib" note="Card 包裹的多步审批：RadioGroup / CheckboxGroup secondary、CustomInput、Steps（maxVisible 7）、StepCount、SkippedCount、Skip ghost sm / Continue primary sm、onSubmit {answers, skipped}；对接 AI SDK 时 needsApproval 的工具走 addToolApprovalResponse。">
        <ApprovalCardView
          questions={[
            { id: "q1", title: "删除 3 条广告并禁言 24 小时？", options: [{ id: "yes", label: "删除并禁言", description: "删 3 条 + 禁言 24 小时" }, { id: "mute", label: "只禁言", description: "保留消息作证据" }], allowCustom: true },
            { id: "q2", title: "哪些群执行？", multiSelect: true, options: [{ id: "g1", label: "DeePlanGroup" }, { id: "g2", label: "CryptoPush_Example" }, { id: "g3", label: "ForwardHubBOT" }] },
            { id: "q3", title: "执行前需要再通知管理员吗？", allowSkip: true },
          ]}
          onSubmit={(r) => toast.success(`演示：审批已提交（已答 ${Object.keys(r.answers).length} 题，跳过 ${r.skipped.length} 题）。`)}
        />
      </Entry>
      <Entry id="chain-of-thought" name="ChainOfThought" href={PRO("chain-of-thought")} status="lib" note="放在 Reasoning 里面列 agent 的步骤（读文件、调工具、改东西）。Step 状态 complete / active / pending / error；Reasoning 停了或报错时 active 步显示 interrupted、pending 步隐藏；active 步带 aria-current=step，ring 是 Loader。">
        <div className="mb-3 flex flex-wrap gap-2">
          <Segmented value={cotStatus} onChange={setCotStatus} ariaLabel="运行状态" options={[{ value: "streaming", label: "streaming" }, { value: "complete", label: "complete" }, { value: "stopped", label: "stopped" }, { value: "error", label: "error" }]} />
        </div>
        <ReasoningView status={cotStatus} duration="9s" text={"先读原消息，再调模型，最后比对规则。"} steps={[
          { title: "读取原消息与判定证据", desc: "消息 #1234 · 9.8 分", status: "complete" },
          { title: "调用 gemini-decision-1", desc: "置信度 0.99", status: cotStatus === "streaming" ? "active" : "complete" },
          { title: "比对 13 类规则", desc: "命中 ad-link", status: cotStatus === "streaming" ? "pending" : "complete" },
          { title: "写入处置日志", status: "pending" },
        ]} collapseDelay={Infinity} />
      </Entry>
      <Entry id="chat-attachment" name="ChatAttachment" href={PRO("chat-attachment")} status="lib" note="消息或输入框里的紧凑文件预览。media（图片 / 视频缩略图，悬停显文件名）与 file（横向文件卡：格式图标 + 文件名 + 大小）两态；Input 默认 multiple，accept 过滤；本地生成 blob URL，移除 / 清空 / 卸载时 revoke。">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => document.getElementById("attach-demo-input")?.click()}>选择文件</Button>
          <input id="attach-demo-input" type="file" accept="image/*,.pdf,.txt" multiple className="hidden" onChange={(e) => {
            if (!e.target.files) return;
            const fresh: AttachFile[] = Array.from(e.target.files).map((f) => ({ id: fileIdSafe(), name: f.name, size: f.size, mime: f.type || "application/octet-stream", src: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined }));
            setAttachFiles((prev) => [...prev, ...fresh]);
            e.target.value = "";
          }} />
          <Button size="sm" variant="secondary" onClick={() => { setAttachFiles([{ id: fileIdSafe(), name: "brief.pdf", size: 824120, mime: "application/pdf" }]); toast.info("演示：加了一份 mock 附件 brief.pdf。"); }}>加一份 mock PDF</Button>
          <span className="text-xs text-[var(--dim)]">图片会显示缩略图，其他文件显示文件卡；点右上 ✕ 移除（blob URL 会 revoke）。</span>
        </div>
        <div className="mt-3"><AttachmentChips files={attachFiles} onRemove={(id) => setAttachFiles((prev) => { const f = prev.find((x) => x.id === id); if (f?.src) URL.revokeObjectURL(f.src); return prev.filter((x) => x.id !== id); })} /></div>
      </Entry>
      <Entry id="chat-conversation" name="ChatConversation" href={PRO("chat-conversation")} status="lib" note="stick-to-bottom 的对话视口（role=log，礼貌 live 区）。内容变长时自动跟到底，用户向上滚就停住跟随、滚回底部再跟随；ScrollButton 只在离开底部时出现；流式回复时根上挂 aria-busy。">
        <div ref={miniLogRef} role="log" aria-label="迷你对话" className="relative h-44 overflow-y-auto rounded-[10px] border border-[var(--border)] px-3 py-2" onScroll={(e) => { const el = e.currentTarget; setMiniLogAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40); }}>
          {MOCK_MSGS.map((m) => (
            <p key={m.id} className="py-1.5 text-[13px] leading-6"><Avatar name={m.user} size={20} /> <b>{m.user}</b> <span className="text-[var(--dim)]">{m.time}</span><br />{m.text}</p>
          ))}
          <p className="py-1.5 text-[13px] leading-6 text-[var(--dim)]">（往上滚，右下角会出现“回到底部”按钮；再滚到底部，按钮消失。）</p>
        </div>
        {!miniLogAtBottom && (
          <div className="mt-2 flex justify-center">
            <Button size="sm" variant="secondary" aria-label="回到底部" onClick={() => { const el = miniLogRef.current; if (el) { el.scrollTop = el.scrollHeight; setMiniLogAtBottom(true); } }}>↓ 回到底部</Button>
          </div>
        )}
      </Entry>
      <Entry id="chat-list-view" name="ChatListView" href={PRO("chat-list-view")} status="lib" note="聊天侧栏与会话选择器的会话行：Icon / Text（Title + Preview）/ Meta；comfortable / compact 两种密度。点一行切会话（上方演示场会跟着切）。">
        <div className="mb-2 flex items-center gap-2">
          <Segmented value={threadDensity} onChange={setThreadDensity} ariaLabel="行密度" options={[{ value: "comfortable", label: "comfortable" }, { value: "compact", label: "compact" }]} />
          <span className="text-xs text-[var(--dim)]">当前会话：{CHAT_THREADS.find((t) => t.id === activeThread)?.title}</span>
        </div>
        <div className="max-w-md"><ThreadsList active={activeThread} onPick={setActiveThread} density={threadDensity} /></div>
      </Entry>
      <Entry id="chat-loader" name="ChatLoader" href={PRO("chat-loader")} status="lib" note="助手回复加载中的占位。主推 Skeleton（头像 + 三行，可配 label 与 sm / md / lg）；旧的 Dots / Pulse / Spinner 已废弃，分别改走 Loader 的 dots / pulse / ring。">
        <div className="space-y-4">
          {(["sm", "md", "lg"] as const).map((s) => (
            <div key={s} className="flex items-center gap-3">
              <Skeleton className={s === "sm" ? "h-7 w-7 !rounded-full" : s === "lg" ? "h-12 w-12 !rounded-full" : "h-9 w-9 !rounded-full"} />
              <div className="flex-1 space-y-2"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-2/3" /></div>
              <span className="text-xs text-[var(--dim)]">{s} · 正在加载回复…</span>
            </div>
          ))}
        </div>
      </Entry>
      <Entry id="chat-message" name="ChatMessage" href={PRO("chat-message")} status="lib" note="User 气泡 + Assistant 行（Avatar / Body / Content / Media / Actions）；variant card 把整轮（推理、答案、Separator、来源）放一张 Card 面上；回复用 Markdown 渲染；流式时显示 TextShimmer 与 dots Loader，没开始时显示 ChatLoader.Skeleton。">
        <div className="space-y-3">
          <div className="flex justify-end"><div className={`max-w-[80%] rounded-2xl rounded-br-md bg-[var(--accent)] px-3.5 py-2 text-sm leading-6 text-white ${LIB_DARK_ACCENT_FIX_CLASS}`}>这条 9.8 分广告怎么处置？</div></div>
          <div className="flex gap-2.5">
            <Avatar name="AI" size={28} />
            <div className="min-w-0 flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
              <MiniMarkdown text={MD_SAMPLE} />
              <Separator className="my-2" />
              <ChatSourcesView sources={SOURCES} maxVisible={2} />
            </div>
          </div>
        </div>
      </Entry>
      <Entry id="chat-message-actions" name="ChatMessageActions" href={PRO("chat-message-actions")} status="lib" note="消息下的行内操作按钮：复制、重试、评分、分享或自定义动作。图标按钮都是 ghost，带 aria-label 与悬停 / 聚焦 tooltip；动作少时用更小的集合。">
        <div className="flex items-center gap-0.5">
          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="复制" onClick={async () => { try { await navigator.clipboard.writeText(MD_SAMPLE); } catch { /* ignore */ } setMsgCopied(true); window.setTimeout(() => setMsgCopied(false), 1500); }}>{msgCopied ? "✓" : "⧉"}</Button></Tooltip.Trigger><Tooltip.Content>复制</Tooltip.Content></Tooltip>
          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="赞" onClick={() => setMsgLiked((v) => (v === "up" ? null : "up"))}>{msgLiked === "up" ? "👍" : "👍︎"}</Button></Tooltip.Trigger><Tooltip.Content>赞</Tooltip.Content></Tooltip>
          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="踩" onClick={() => setMsgLiked((v) => (v === "down" ? null : "down"))}>{msgLiked === "down" ? "👎" : "👎︎"}</Button></Tooltip.Trigger><Tooltip.Content>踩</Tooltip.Content></Tooltip>
          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="重新生成" onClick={() => toast.info("演示：重新生成（mock）。")}>↻</Button></Tooltip.Trigger><Tooltip.Content>重新生成</Tooltip.Content></Tooltip>
          <Tooltip><Tooltip.Trigger><Button size="sm" variant="ghost" aria-label="分享" onClick={() => toast.info("演示：分享链接已复制（mock）。")}>↗</Button></Tooltip.Trigger><Tooltip.Content>分享</Tooltip.Content></Tooltip>
        </div>
        <p className="mt-1 text-xs text-[var(--dim)]">当前评分：{msgLiked === "up" ? "赞" : msgLiked === "down" ? "踩" : "未评分"}{msgCopied ? " · 已复制" : ""}</p>
      </Entry>
      <Entry id="chat-source" name="ChatSource" href={PRO("chat-source")} status="lib" note="答案旁的引用 chip（链接或文件）+ 悬停预览；ChatSources 把多个来源收进 Disclosure（叠放 favicon + 计数），List 上 maxVisible 控制先显几个，超出显示 +N more（点开变 Show less），切换时已显的 chip 不卸载，焦点与打开的预览保持。">
        <ChatSourcesView sources={SOURCES} maxVisible={3} />
        <p className="mt-3 text-xs text-[var(--dim)]">单个 chip：<ChatSourceChip s={SOURCES[0]!} />（悬停看预览；链接新标签打开，rel=noopener noreferrer；文档 chip 是纯文本。）</p>
      </Entry>
      <Entry id="chat-tool" name="ChatTool" href={PRO("chat-tool")} status="lib" note="工具调用的可折叠卡片：Trigger（状态图标 + 工具名，运行时标签带 shimmer）+ Content（Args / Result / Error / Approval）；五态 input-streaming / input-available / output-available / output-error / requires-action；ChatToolGroup 归组连续调用。子路径导入（依赖 shiki），本实现 JSON 用手写代码块，不装 shiki。">
        <ChatToolGroupView title="2 个工具调用">
          <ChatToolView toolName="searchDocs" state="output-available" input={{ query: "ad-link 处置规则" }} output={{ rule: "ad-link", action: "delete + mute 24h" }} defaultExpanded />
          <ChatToolView toolName="deleteMessage" state="requires-action" input={{ messageId: 1234 }} onApprove={() => toast.success("演示：已批准删除。")} onReject={() => toast.info("演示：已拒绝删除。")} defaultExpanded />
          <ChatToolView toolName="fetchHistory" state="output-error" input={{ userId: "u_42" }} errorText="上游超时（mock）：30 秒内未返回。" />
        </ChatToolGroupView>
      </Entry>
      <Entry id="code-block" name="CodeBlock" href={PRO("code-block")} status="lib" note="给 AI Markdown 用的代码块：Header（语言标签 + CopyButton）+ Code（shiki 高亮，theme 默认 github-light）。子路径导入（依赖 shiki），本实现高亮用手写小分词器（关键字 / 字符串 / 注释 / 数字），不冒充 shiki。">
        <CodeBlockView code={"const action = decide(item);\nif (action === \"delete\") {\n  await deleteMessage(item.id); // 9.8 分广告\n}"} language="typescript" />
      </Entry>
      <Entry id="loader" name="Loader" href={PRO("loader")} status="lib" note="通用加载与 AI 工作指示器：14 变体 ring / classic / dots / pulse / scan / grid / shuffle / wave / sparkle / atom / morph / helix / twist / infinity；sm 16 / md 20 / lg 24px（infinity 宽 1.5 倍）；颜色与 Spinner 同值 accent（默认）/ current / success / warning / danger；根带 role=status，读屏读 label 而不是 Loading；prefers-reduced-motion 时停在静帧。">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select aria-label="变体" selectedKey={loaderVariant} onSelectionChange={(k) => { if (k) setLoaderVariant(k as LoaderVariant); }} className="w-40">
            {LOADER_VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <Segmented value={loaderSize} onChange={setLoaderSize} ariaLabel="尺寸" options={[{ value: "sm", label: "sm 16" }, { value: "md", label: "md 20" }, { value: "lg", label: "lg 24" }]} />
          <Segmented value={loaderColor} onChange={setLoaderColor} ariaLabel="颜色" options={[{ value: "accent", label: "accent" }, { value: "current", label: "current" }, { value: "success", label: "success" }, { value: "warning", label: "warning" }, { value: "danger", label: "danger" }]} />
          <Input aria-label="标签文字" value={loaderLabel} onChange={(e) => setLoaderLabel(e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <LoaderView variant={loaderVariant} size={loaderSize} color={loaderColor} label={loaderLabel} />
          <span className="flex flex-wrap gap-3">
            {LOADER_VARIANTS.map((v) => (
              <button key={v} type="button" onClick={() => setLoaderVariant(v)} aria-label={`变体 ${v}`} className={`flex h-12 w-12 items-center justify-center rounded-lg border ${v === loaderVariant ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)]"}`}>
                <LoaderView variant={v} size="sm" color={loaderColor} />
              </button>
            ))}
          </span>
        </div>
      </Entry>
      <Entry id="markdown" name="Markdown" href={PRO("markdown")} status="lib" note="渲染 AI 回答的 Markdown：内置组件按 memo 分块，token 更新只重渲染变了的块；Streamdown 另做不完整 Markdown 修复、流式动画与光标。子路径导入（依赖 streamdown / react-markdown / marked / remark-*），本实现是手写小渲染器（标题、列表、行内代码、围栏代码、引用、链接、加粗斜体），不装这些包。">
        <div className="mb-2 flex gap-2">
          <Button size="sm" className={LIB_DARK_ACCENT_FIX_CLASS} onClick={replayMd}>流式重放这段回答</Button>
          {mdStreaming && <span className="self-center text-xs"><TextShimmerView>正在生成…</TextShimmerView></span>}
        </div>
        <div className="rounded-[10px] border border-[var(--border)] p-3">
          <MiniMarkdown text={mdShown + (mdStreaming ? "▍" : "")} />
        </div>
      </Entry>
      <Entry id="model-selector" name="ModelSelector" href={PRO("model-selector")} status="lib" note="模型选择器：每个模型自有 efforts，tone max / ultra 的档位更耗用量；切到没有当前 level 的模型用它的 defaultEffort，切回来恢复用户的 level；Search 按模型与厂商名过滤；Effort 是 Slider（少于两档时隐藏）；Detail 卡片在列表旁显示评分与上下文窗口。">
        <div className="flex items-center gap-2">
          <ModelSelectorView value={demoModel} onChange={(id) => { setDemoModel(id); toast.info(`演示：模型已切到 ${id}（mock，只记选择）。`); }} />
          <span className="text-xs text-[var(--dim)]">点触发器打开：搜索、按厂商分组、Effort 滑块、详情卡片都在里面；GPT-5.2 是禁用态（点不了）。</span>
        </div>
      </Entry>
      <Entry id="prompt-input" name="PromptInput" href={PRO("prompt-input")} status="lib" note="聊天与 agent 界面的消息输入框：Shell / Content / Attachments / TextArea / Toolbar / Send；Queue 在输入框上方放排队追问（可拖拽重排）；TokenInput 是 RAC TokenField（alpha），@ 提及菜单锚在光标处；状态 ready / submitted / streaming / error 切换发送与停止行为；lockInputOnRun 默认 true。完整版见上方对话演示，这里只验状态切换。">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 rounded-2xl border-0 bg-[var(--surface)] px-2 py-1.5 shadow-[var(--shadow-md)]">
            <Textarea aria-label="迷你输入框" placeholder="What do you want to know?" value={promptMini} onChange={(e) => setPromptMini(e.target.value)} rows={1} className="!border-0 !py-1 shadow-none" />
            {promptStatus === "ready" ? <Button size="sm" aria-label="发送" className={`shrink-0 ${LIB_DARK_ACCENT_FIX_CLASS}`} style={{ width: 36, height: 36, minHeight: 36, borderRadius: 999, padding: 0 }} onClick={() => { if (promptMini.trim()) { setPromptStatus("submitted"); window.setTimeout(() => setPromptStatus("ready"), 1200); } }}>↑</Button>
              : promptStatus === "error" ? <Button size="sm" variant="secondary" aria-label="重试" onClick={() => setPromptStatus("ready")}>↻ 重试</Button>
              : <Button size="sm" variant="secondary" aria-label="停止" onClick={() => setPromptStatus("ready")}>■ 停止</Button>}
          </span>
          <span className="text-xs text-[var(--dim)]">{promptStatus === "ready" ? "就绪" : promptStatus === "submitted" ? "已提交，输入框锁定" : promptStatus === "streaming" ? "生成中，发送变停止" : "出错，发送变重试"}</span>
        </div>
        <details className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-[var(--dim)]">调试：运行状态切换</summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Segmented value={promptStatus} onChange={setPromptStatus} ariaLabel="运行状态" options={[{ value: "ready", label: "ready" }, { value: "submitted", label: "submitted" }, { value: "streaming", label: "streaming" }, { value: "error", label: "error" }]} />
          </div>
        </details>
      </Entry>
      <Entry id="prompt-suggestion" name="PromptSuggestion" href={PRO("prompt-suggestion")} status="lib" note="空聊天里的建议提示：Header（Title + Description）+ Items；pill（默认）与 card（带描述 / 标签 / 底部时）两态；点一条把它填进输入框（上方演示场的输入框）。">
        <div className="mb-3 flex items-center gap-2">
          <Segmented value={suggVariant} onChange={setSuggVariant} ariaLabel="变体" options={[{ value: "pill", label: "pill" }, { value: "card", label: "card" }]} />
          {suggPicked && <span className="text-xs text-[var(--dim)]">已选：{suggPicked}</span>}
        </div>
        <div>
          <h4 className="text-sm font-semibold">What can I help with?</h4>
          <p className="text-xs text-[var(--dim)]">Start from a suggested prompt.</p>
          <div className={suggVariant === "card" ? "mt-2 grid gap-2 sm:grid-cols-2" : "mt-2 flex flex-wrap gap-2"}>
            {suggGroups.map((g) => (
              <div key={g.label} className={suggVariant === "card" ? "" : "contents"}>
                {suggVariant === "card" && <h5 className="col-span-full text-xs font-semibold text-[var(--dim)]">{g.label}</h5>}
                {g.items.map((it) => (
                  <button
                    key={it} type="button"
                    className={suggVariant === "card" ? "rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 text-left hover:border-[var(--accent)]" : "rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[13px] hover:border-[var(--accent)] active:scale-[.98]"}
                    onClick={() => setSuggPicked(it)}
                  >
                    <span className="block text-[13px] font-medium">{it}</span>
                    {suggVariant === "card" && <span className="mt-0.5 block text-xs text-[var(--dim)]">点一下填进输入框，直接发。</span>}
                    {suggVariant === "pill" && <span aria-hidden="true"> →</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Entry>
      <Entry id="reasoning" name="Reasoning" href={PRO("reasoning")} status="lib" note="模型思考过程的折叠块（Disclosure）：status streaming / complete / stopped / error；duration 是格式化好的思考时长（如 9s）；autoExpand 首段流进来时自动打开；collapseDelay 默认 1000ms 后自动收起（Infinity 永不收），用户手动切过就不再自动收；内容是 Reasoning.Text + ChainOfThought；body 流式时挂 aria-busy。">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Segmented value={reasonStatus} onChange={setReasonStatus} ariaLabel="运行状态" options={[{ value: "streaming", label: "streaming" }, { value: "complete", label: "complete" }, { value: "stopped", label: "stopped" }, { value: "error", label: "error" }]} />
          <Select aria-label="自动收起延迟" selectedKey={collapseDelay} onSelectionChange={(k) => { if (k) setCollapseDelay(String(k)); }} className="w-44">
            <option value="1000">collapseDelay 1000</option>
            <option value="5000">collapseDelay 5000</option>
            <option value="Infinity">collapseDelay ∞</option>
          </Select>
        </div>
        <ReasoningView status={reasonStatus} duration="9s" text={"先读原消息，再调模型，最后比对规则。"} steps={[
          { title: "读取原消息与判定证据", status: "complete" },
          { title: "调用 gemini-decision-1", status: reasonStatus === "streaming" ? "active" : "complete" },
          { title: "比对 13 类规则", status: reasonStatus === "streaming" ? "pending" : "complete" },
        ]} collapseDelay={collapseDelay === "Infinity" ? Infinity : Number(collapseDelay)} />
      </Entry>
      <Entry id="text-shimmer" name="TextShimmer" href={PRO("text-shimmer")} status="lib" note="流式、思考与加载标签的闪烁文字：底字 45% 透明度，高光满强度扫过；用 currentColor，可传 text-muted 等颜色工具类；--spread 默认 4ch 控制高光拖尾宽度；prefers-reduced-motion 时去动画、实色显示。">
        <div className="flex flex-wrap items-center gap-3">
          <Input aria-label="闪烁文字" value={shimmerText} onChange={(e) => setShimmerText(e.target.value)} className="w-44" />
          <label className="flex items-center gap-2 text-xs">--spread <Slider label="高光拖尾宽度" value={shimmerSpread} onChange={setShimmerSpread} minValue={1} maxValue={12} className="w-32" /> {shimmerSpread}ch</label>
          <span className="text-muted text-sm"><TextShimmerView>{shimmerText || "Thinking…"}</TextShimmerView></span>
        </div>
      </Entry>
    </Section>
  );
}

let attachIdCounter = 1000;
function fileIdSafe() { return attachIdCounter++; }

/* ---------- 页面组装 ---------- */

const LIB_SECTIONS = [
  { id: "shell", title: "外壳与已落地" },
  { id: "data", title: "数据展示" },
  { id: "charts", title: "指标卡与图表" },
  { id: "form", title: "表单增强" },
  { id: "overlay", title: "交互与浮层（R2-5）" },
  { id: "heavy", title: "成页与重型（R2-6）" },
  { id: "ai", title: "AI 类（18 件）" },
];

/* L05 右侧本页目录：当前分组的条目（id 与 Entry 的 id 一一对应，
   点条目用 scrollIntoView，不用 href 锚点——控制台用 hash 路由，
   href="#entry-…" 会改路由跳页）。 */
const LIB_ENTRIES: Record<string, { id: string; title: string }[]> = {
  shell: [
    { id: "app-layout", title: "AppLayout" },
    { id: "sidebar", title: "Sidebar" },
    { id: "navbar", title: "Navbar" },
    { id: "drawer", title: "Drawer（已落地）" },
    { id: "dropdown", title: "Dropdown（已落地）" },
    { id: "toast", title: "Toast（已落地）" },
    { id: "modal-sheet", title: "Modal / Sheet" },
  ],
  data: [
    { id: "data-grid", title: "DataGrid" },
    { id: "empty-state", title: "EmptyState" },
    { id: "action-bar", title: "ActionBar" },
    { id: "list-view", title: "ListView" },
    { id: "item-card", title: "ItemCard / ItemCardGroup" },
    { id: "widget", title: "Widget" },
  ],
  charts: [
    { id: "kpi", title: "KPI / KPIGroup" },
    { id: "charts-8", title: "图表 7 件" },
  ],
  form: [
    { id: "cell", title: "CellSelect / CellSwitch / CellSlider / CellColorPicker" },
    { id: "check-radio-cards", title: "CheckboxButtonGroup / RadioButtonGroup" },
    { id: "inline-native-select", title: "InlineSelect / NativeSelect" },
    { id: "number-stepper", title: "NumberStepper" },
    { id: "segment", title: "Segment" },
    { id: "stepper", title: "Stepper" },
  ],
  overlay: [
    { id: "command", title: "Command" },
    { id: "context-menu", title: "ContextMenu" },
    { id: "hover-card", title: "HoverCard" },
    { id: "drop-zone", title: "DropZone" },
    { id: "rating", title: "Rating" },
    { id: "timeline", title: "Timeline" },
    { id: "floating-toc", title: "FloatingTOC" },
    { id: "pressable-feedback", title: "PressableFeedback" },
    { id: "emoji-reaction-button", title: "EmojiReactionButton" },
    { id: "emoji-picker", title: "EmojiPicker" },
    { id: "resizable", title: "Resizable 拖拽面板组" },
  ],
  heavy: [
    { id: "kanban", title: "Kanban" },
    { id: "agenda", title: "Agenda" },
    { id: "file-tree", title: "FileTree" },
    { id: "carousel", title: "Carousel" },
    { id: "holo-card", title: "HoloCard" },
    { id: "map", title: "Map" },
    { id: "rich-text-editor", title: "RichTextEditor" },
  ],
  ai: [
    { id: "ai-playground", title: "AI 助手演示场" },
    { id: "approval-card", title: "ApprovalCard" },
    { id: "chain-of-thought", title: "ChainOfThought" },
    { id: "chat-attachment", title: "ChatAttachment" },
    { id: "chat-conversation", title: "ChatConversation" },
    { id: "chat-list-view", title: "ChatListView" },
    { id: "chat-loader", title: "ChatLoader" },
    { id: "chat-message", title: "ChatMessage" },
    { id: "chat-message-actions", title: "ChatMessageActions" },
    { id: "chat-source", title: "ChatSource" },
    { id: "chat-tool", title: "ChatTool" },
    { id: "code-block", title: "CodeBlock" },
    { id: "loader", title: "Loader" },
    { id: "markdown", title: "Markdown" },
    { id: "model-selector", title: "ModelSelector" },
    { id: "prompt-input", title: "PromptInput" },
    { id: "prompt-suggestion", title: "PromptSuggestion" },
    { id: "reasoning", title: "Reasoning" },
    { id: "text-shimmer", title: "TextShimmer" },
  ],
};

/* 独立 demo 页首的浅/深色切换按钮（只在 standalone 时渲染）。
 * 与控制台顶栏共用同一份主题状态（useShellTheme ← ThemeController
 * 的唯一 useTheme 实例），不是第二个 useTheme；是真的 <button>，
 * 带两态不同的 aria-label；图标用 ui.tsx 已有的 sun/moon。 */
function StandaloneThemeToggle() {
  const { theme, setTheme } = useShellTheme();
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setPrefersDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const effective = resolveEffectiveTheme(theme, prefersDark);
  return (
    <button
      type="button"
      aria-label={standaloneThemeToggleLabel(effective)}
      onClick={() => setTheme(nextStandaloneTheme(theme, prefersDark))}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-3)]"
    >
      <Icon name={effective === "dark" ? "sun" : "moon"} size={16} />
      {effective === "dark" ? "浅色" : "深色"}
    </button>
  );
}

export function ComponentLibraryPage({ navigate, standalone }: { navigate?: NavigateFn; standalone?: boolean }) {
  const [activeSection, setActiveSection] = useState("shell");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first?.target.id) setActiveSection(first.target.id.replace("section-", ""));
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    LIB_SECTIONS.forEach((s) => { const el = document.getElementById(`section-${s.id}`); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-5 sm:px-6">
      <nav aria-label="分组导航" className="sticky top-5 hidden h-fit w-52 shrink-0 lg:block">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">分组</p>
        <div className="space-y-0.5">
          {LIB_SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} aria-current={activeSection === s.id ? "true" : undefined} className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm ${activeSection === s.id ? "bg-[var(--surface-3)] font-semibold text-[var(--text)]" : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"}`}>
              <span aria-hidden="true" className={`mr-2 h-1.5 w-1.5 shrink-0 rounded-full ${activeSection === s.id ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`} />
              {s.title}
            </button>
          ))}
        </div>
      </nav>
      <div className="min-w-0 flex-1 space-y-8">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[30px] font-bold leading-9 tracking-tight">组件库</h1>
            <p className="mt-1 text-[13px] leading-6 text-[var(--dim)]">
              对照表 52 行（AI 类 1 行含 18 件，合计 69 个组件条目），每个条目都是真实可用的组件——与产品页共用同一份组件代码（ui.tsx 共享导出 + @heroui/react 3.2.8 免费版 + Recharts），演示用的 mock 只是数据，不调任何后端接口。已落地的条目链去产品页；表格基建（R2-1）、共享行组件（R2-2）、总览 KPI / 图表（R2-3）按批次指向，不在这里重复造。
            </p>
          </div>
          {standalone ? <StandaloneThemeToggle /> : null}
        </div>
        <details className="mt-3 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium text-[var(--text-2)]">分组导航</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {LIB_SECTIONS.map((s) => (
              <Button key={s.id} size="sm" className={activeSection === s.id ? LIB_DARK_ACCENT_FIX_CLASS : ""} variant={activeSection === s.id ? "primary" : "secondary"} onClick={() => document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{s.title}</Button>
            ))}
          </div>
        </details>
      </div>
      <ShellSection navigate={navigate} />
      <DataSection navigate={navigate} />
      <KpiChartsSection />
      <FormSection />
      <OverlaySection navigate={navigate} sections={LIB_SECTIONS} activeSection={activeSection} />
      <HeavySection />
      <AiSection />
      </div>
      <nav aria-label="本页目录" className="sticky top-5 hidden h-fit w-48 shrink-0 xl:block">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">本页目录</p>
        <div className="space-y-0.5">
          {(LIB_ENTRIES[activeSection] ?? []).map((e) => (
            <button key={e.id} type="button" onClick={() => document.getElementById(`entry-${e.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]">{e.title}</button>
          ))}
        </div>
      </nav>
    </div>
  );
}
