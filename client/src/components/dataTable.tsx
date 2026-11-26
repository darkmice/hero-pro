/* R2-1 表格基建（heroui-pro-mapping §3.2 / §4 R2-1 行）：
   数据层一律 @tanstack/react-table 9.3.1（v9 新 API：useTable +
   tableFeatures；不用已废弃的 legacy 兼容层），渲染层手写 <table> +
   Tailwind；不用 HeroUI Table，不用 Pro DataGrid 引擎，不装
   @heroui-pro/react。
   本文件只放各表共用的壳子与桥接，不含任何一页的业务列定义：
   - appTableFeatures / useAppTable：全量 stockFeatures + 排序/分页行模型
   - TableHead：按列定义渲染 <thead>（排序按钮 / 全选复选框 / 粘性表头）
   - TableToolbar：表格自己的工具栏（刷新 + 列显隐 + 右侧槽位）
   - TablePagination / PageFooter：表尾分页（免费 Pagination 复合件）
   - SelectionActionBar：批量操作栏（免费 Toolbar 拼成的浮动 pill）
   - StatusChip：表格状态单元格（免费 Chip；violet / dark 无等价色，留 Badge）
   - SentinelRow：加载更多哨兵行 + 免费 Spinner（基建就绪，当前各表均用分页，暂无调用）
   - 桥接：服务端排序 SortState <-> SortingState、分页、选择集互转、
     pageNumbers / pageCount / clampPage / paginate（自 App.tsx 平移，一字不动）
   列宽走 auto；固定列沿用 theme.css 的 .data-table 规则（粘性操作列，
   right: 0 + 不透明底 + 左阴影），不在此重写。
   列定义 meta 走 tableFeatures 的 columnMeta 槽位（类型内联于
   appTableFeatures，不做全局声明合并）：className（沿用各表原 Th
   宽度/对齐类）、sortable（是否可点排序）、selectScope（全选列的作用域）。 */
import { useRef, useEffect, type ReactNode } from "react";
import {
  createPaginatedRowModel,
  createSortedRowModel,
  stockFeatures,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type PaginationState,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type Updater,
} from "@tanstack/react-table";
import type { ReactTable } from "@tanstack/react-table";
import { Chip, Dropdown, Pagination, Separator, Spinner, Toolbar, Button as HeroButton } from "@heroui/react";
import { Button, Checkbox, Icon, Select, Th, Badge } from "./ui";

/* 全站表格共用的 features：stockFeatures（排序/分页/选择/列显隐等 17 件）
   + 排序与分页行模型；columnMeta 槽位声明各表列定义的 meta 形状。
   注意：paginatedRowModel 全站共用、并未只在分页表上挂（R2-1 实施报告
   §5「静态表只用 core row model」与此不符——见 useAppTable 的 D1 订正
   注释）；无分页态的表靠 useAppTable 注入 pageSize = 行数来全显。 */
export const appTableFeatures = tableFeatures({
  ...stockFeatures,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: {} as {
    /** 沿用各表原 Th 的宽度 / 对齐类（如 w-[104px]、text-right）。 */
    className?: string;
    /** 可点排序的列（表头渲染排序按钮）；默认不可排序。 */
    sortable?: boolean;
    /** 全选列的作用域：page（当前页，默认）/ all（全部行）。 */
    selectScope?: "page" | "all";
  },
});
export type AppFeatures = typeof appTableFeatures;
/* useTable 返回的 ReactTable（含 .state 与 Subscribe）；组件 props 一律用它，
   不用 core Table（core Table 没有 .state）。 */
export type AppTable<TData extends RowData> = ReactTable<AppFeatures, TData>;
export type AppColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<AppFeatures, TData, TValue>;

/* 调用方只传 data / columns / state / onChange 等，不用重复写 features。
   D1 修复（2026-11-26）：paginatedRowModel 无条件挂在 appTableFeatures
   上，TanStack 默认分页态 pageSize=10；没传 state.pagination 的表
   （13 类分布、清理、监测拆解×3、监测按日、监测按群、能力矩阵、豁免、
   厂商，共 8 处调用点）getRowModel() 只返回前 10 行。修复：这类表由
   本函数注入受控分页态 { pageIndex: 0, pageSize: 行数 }，getRowModel
   即返回全部行；传了 state.pagination 的 11 张分页表原样直通，行为
   逐字不变。注入用受控 state（每渲染按当前 data.length 重算），不用
   initialState——数据经查询异步到达，initialState 只在挂载时读一次，
   会冻住首屏长度；空数据时 pageSize 取 1（避开 pageSize=0 的除零）。
   附带修正：TableHead 的 page 作用域全选（getIsAllPageRowsSelected）
   在无分页表上此前只选中前 10 行，现选中全部行，与“无分页”语义一致。 */
export function useAppTable<TData extends RowData>(options: Omit<TableOptions<AppFeatures, TData>, "features">) {
  const pagination = options.state?.pagination ?? { pageIndex: 0, pageSize: Math.max(options.data.length, 1) };
  return useTable({ features: appTableFeatures, ...options, state: { ...options.state, pagination } });
}

export type StatusTone = "neutral" | "accent" | "success" | "danger" | "warning" | "violet" | "dark";

/* ---------- 排序桥接（服务端排序：SortState <-> SortingState） ---------- */
export type SimpleSort<K extends string> = { key: K | null; dir: "asc" | "desc" };

export function sortingFromSort<K extends string>(sort: SimpleSort<K>, emptyKey?: K): SortingState {
  if (sort.key === null || (emptyKey !== undefined && sort.key === emptyKey)) return [];
  return [{ id: sort.key, desc: sort.dir === "desc" }];
}

export function sortFromSorting<K extends string>(sorting: SortingState, emptyKey?: K): SimpleSort<K> {
  const first = sorting[0];
  if (!first) return { key: (emptyKey ?? null) as K | null, dir: "asc" };
  return { key: first.id as K, dir: first.desc ? "desc" : "asc" };
}

/* TanStack 的 onSortingChange 回调：把 SortingState 翻回各表原有的
   SortState；排序真的变了才 setSort（+ 有分页的表回第 1 页，与原
   apply*Sort 一致）。setPage 可省：客户端排序的表（13 类分布、
   厂商、分值映射）没有服务端分页，不回页。
   emptyKey 是各表的“默认态”键：多数表为 null（不传 sortBy），队列为
   "default"。 */
export function makeSortingChangeHandler<K extends string>(
  sort: SimpleSort<K>,
  setSort: (s: SimpleSort<K>) => void,
  setPage?: (n: number) => void,
  emptyKey?: K,
) {
  return (updater: Updater<SortingState>) => {
    const prev = sortingFromSort(sort, emptyKey);
    const next = typeof updater === "function" ? (updater as (old: SortingState) => SortingState)(prev) : updater;
    const s = sortFromSorting<K>(next, emptyKey);
    if (s.key !== sort.key || s.dir !== sort.dir) {
      setSort(s);
      setPage?.(1);
    }
  };
}

/* ---------- 分页桥接 ---------- */
/* 调用方把当前分页态包进闭包（TanStack 的 Updater 可能是函数，需用当前
   态解析）；页码变了只改页，每页条数变了回第 1 页（与原 PaginationBar
   的 onPageSizeChange 一致）。 */
export function makePaginationChangeHandler(
  pagination: PaginationState,
  setPage: (n: number) => void,
  setPageSize: (n: number) => void,
) {
  return (updater: Updater<PaginationState>) => {
    const next = typeof updater === "function" ? (updater as (old: PaginationState) => PaginationState)(pagination) : updater;
    if (next.pageSize !== pagination.pageSize) {
      setPageSize(next.pageSize);
      setPage(1);
      return;
    }
    setPage(next.pageIndex + 1);
  };
}

/* ---------- 选择集互转 ---------- */
export function idsFromRowSelection(sel: RowSelectionState): number[] {
  return Object.keys(sel)
    .filter((k) => sel[k])
    .map(Number)
    .sort((a, b) => a - b);
}

export function rowSelectionFromIds(ids: Iterable<number>): RowSelectionState {
  const out: RowSelectionState = {};
  for (const id of ids) out[String(id)] = true;
  return out;
}

export function selectionCount(sel: RowSelectionState): number {
  return idsFromRowSelection(sel).length;
}

/* ---------- 前端分页（自 App.tsx 平移，一字不动） ---------- */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const p = clampPage(page, items.length, pageSize);
  return items.slice((p - 1) * pageSize, p * pageSize);
}
export function pageNumbers(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set<number>([1, 2, totalPages - 1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

/* ---------- 列定义小件 ---------- */
/* 全选列：表头复选框由 TableHead 按 id === "select" 渲染；行复选框由
   本列的 cell 渲染（绑 row.getIsSelected / row.toggleSelected，包一层
   stopPropagation——可点开的行点复选框不触发行点开）。rowLabel 给行复
   选框一个具体的无障碍标签（不传则为通用“选择本行”）。 */
export function selectColumn<TData extends RowData>(scope: "page" | "all" = "page", className = "w-[36px]", rowLabel?: (row: Row<AppFeatures, TData>) => string): AppColumnDef<TData> {
  return {
    id: "select",
    header: "",
    meta: { className, selectScope: scope },
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <span onClick={(e) => e.stopPropagation()}>
        <Checkbox isSelected={row.getIsSelected()} onChange={(v) => row.toggleSelected(v)} label={rowLabel ? rowLabel(row) : "选择本行"} />
      </span>
    ),
  };
}

/* ---------- 表头 ---------- */
/* 按列定义渲染 <thead>：select 列放全选复选框（作用域按 meta.selectScope；
   mappings 表是 all，其余表是 page——与各表原行为一致），sortable 列放
   排序按钮（↕ / ↑ / ↓，与原 SortTh / 行内按钮同一视觉；第三点回默认态
   由 TanStack 的 getToggleSortingHandler + enableSortingRemoval 负责），
   其余列放纯文本。表头粘性：sticky top-0 + z-10（Th 自带 surface-2 底，
   滚动时不透）；固定操作列仍走 theme.css 的 sticky right。 */
export function TableHead<TData extends RowData>({ table }: { table: AppTable<TData> }) {
  return (
    <thead>
      {table.getHeaderGroups().map((hg) => (
        <tr key={hg.id}>
          {hg.headers.map((header) => {
            const col = header.column;
            const meta = col.columnDef.meta;
            const label = typeof col.columnDef.header === "string" ? col.columnDef.header : col.id;
            if (col.id === "select") {
              const scope = meta?.selectScope ?? "page";
              const all = scope === "all" ? table.getIsAllRowsSelected() : table.getIsAllPageRowsSelected();
              const some = scope === "all" ? table.getIsSomeRowsSelected() : table.getIsSomePageRowsSelected();
              return (
                <Th key={header.id} className={`sticky top-0 z-10 ${meta?.className ?? ""}`}>
                  <Checkbox
                    isSelected={all}
                    isIndeterminate={some && !all}
                    onChange={(v) => {
                      if (scope === "all") table.toggleAllRowsSelected(v);
                      else table.toggleAllPageRowsSelected(v);
                    }}
                    label={`全选${scope === "all" ? "全部" : "当前页"}`}
                  />
                </Th>
              );
            }
            if (meta?.sortable) {
              const sorted = col.getIsSorted();
              return (
                <Th key={header.id} className={`sticky top-0 z-10 ${meta?.className ?? ""}`}>
                  <button
                    type="button"
                    onClick={col.getToggleSortingHandler()}
                    aria-label={`按${label}排序`}
                    className="inline-flex items-center gap-1 hover:text-[var(--text)]"
                  >
                    {label}
                    {sorted === "desc" ? " ↓" : sorted === "asc" ? " ↑" : " ↕"}
                  </button>
                </Th>
              );
            }
            return (
              <Th key={header.id} className={`sticky top-0 z-10 ${meta?.className ?? ""}`}>
                {label}
              </Th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}

/* ---------- 表格工具栏 ---------- */
/* 表格自己的工具栏（放 Card 内、TableWrap 上方，不放页顶）：
   左侧刷新（该表自己的查询键）+ 列显隐菜单；右侧 statusText 与 right 槽
   （导出按钮等）。静态表（无服务端查询）不配工具栏。 */
export function TableToolbar<TData extends RowData>({
  onRefresh,
  refreshing = false,
  refreshLabel = "刷新表格",
  table,
  right,
  statusText,
}: {
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshLabel?: string;
  table?: AppTable<TData>;
  right?: ReactNode;
  statusText?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-2" role="toolbar" aria-label="表格工具栏">
      {onRefresh && (
        <Button size="sm" variant="outline" disabled={refreshing} onClick={onRefresh} aria-label={refreshLabel}>
          <Icon name="refresh" size={14} className={refreshing ? "animate-spin" : undefined} />
          {refreshing ? "刷新中…" : "刷新"}
        </Button>
      )}
      {table && <ColumnMenu table={table} />}
      <span className="min-w-0 flex-1" />
      {statusText}
      {right}
    </div>
  );
}

/* 列显隐菜单：列出可隐藏的列（select / 操作列 enableHiding: false），
   勾选即显隐；状态进表的 columnVisibility，不动业务数据。 */
export function ColumnMenu<TData extends RowData>({ table }: { table: AppTable<TData> }) {
  const cols = table.getAllLeafColumns().filter((c) => c.getCanHide());
  if (cols.length === 0) return null;
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="选择显示的列"
        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg px-3 text-xs font-medium whitespace-nowrap text-[var(--dim)] transition-all select-none hover:bg-[var(--surface-3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] active:scale-[.98] disabled:opacity-45 disabled:pointer-events-none"
      >
        <Icon name="sliders" size={14} />
        列
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start">
        <div className="min-w-[180px] p-1.5" role="group" aria-label="选择显示的列">
          {cols.map((c) => (
            <Checkbox
              key={c.id}
              isSelected={c.getIsVisible()}
              onChange={(v) => c.toggleVisibility(v)}
              label={typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
              contentClassName="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-[var(--surface-2)]"
            />
          ))}
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/* ---------- 表尾分页 ---------- */
/* 免费 Pagination 复合件（Pagination.Summary / Content / Link /
   Previous / Next / Ellipsis）+ 每页条数 Select；页码折叠沿用原
   pageNumbers（≤7 全列，>7 首二 + 尾二 + 当前前后一页）。 */
export function PageFooter({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  label,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  label: string;
}) {
  const tp = pageCount(total, pageSize);
  const cur = clampPage(page, total, pageSize);
  const nums = pageNumbers(cur, tp);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-1.5" aria-label={`${label}分页`}>
      <Pagination size="sm" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        <Pagination.Summary className="text-xs text-[var(--dim)]">
          共 <span className="font-mono2 font-semibold text-[var(--text)]">{total}</span> 条 · 第 {cur} / {tp} 页
        </Pagination.Summary>
        <Pagination.Content className="ml-auto flex flex-wrap items-center gap-1">
          <Pagination.Previous isDisabled={cur <= 1} onPress={() => onPageChange(cur - 1)}>
            上一页
          </Pagination.Previous>
          {nums.map((n, i) =>
            n === "…" ? (
              <Pagination.Ellipsis key={`e${i}`} />
            ) : (
              <Pagination.Item key={n}>
                <Pagination.Link isActive={n === cur} onPress={() => onPageChange(n)}>
                  {n}
                </Pagination.Link>
              </Pagination.Item>
            ),
          )}
          <Pagination.Next isDisabled={cur >= tp} onPress={() => onPageChange(cur + 1)}>
            下一页
          </Pagination.Next>
        </Pagination.Content>
      </Pagination>
      <label className="flex items-center gap-1.5 text-xs text-[var(--dim)]">
        每页
        <Select aria-label={`${label}每页条数`} selectedKey={pageSize} onSelectionChange={(k) => { if (k != null) onPageSizeChange(Number(k)); }} className="text-xs">
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s} 条
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

/* 表格版分页：从表实例取页码 / 每页条数（手动分页时 pageCount 由调用方
   按 total 算好传进表；客户端分页由 getPaginationRowModel 算）。 */
export function TablePagination<TData extends RowData>({ table, total, label }: { table: AppTable<TData>; total: number; label: string }) {
  const { pageIndex, pageSize } = table.state.pagination;
  return (
    <PageFooter
      total={total}
      page={pageIndex + 1}
      pageSize={pageSize}
      onPageChange={(p) => table.setPageIndex(p - 1)}
      onPageSizeChange={(s) => {
        table.setPageSize(s);
        table.setPageIndex(0);
      }}
      label={label}
    />
  );
}

/* ---------- 批量操作栏 ---------- */
/* 按 ActionBar 拼成的免费 Toolbar：浮动底部居中 pill；三段 Prefix
   （免费 Chip 显示已选数量）+ Separator + Content（调用方传的批量按钮，
   size=sm；文字 span 加 max-sm:sr-only，640px 以下只留图标）+ Separator
   + Suffix（isIconOnly 清除选择按钮）。显隐由选中数量驱动，进出动画手
   写过渡（opacity + translate，200ms）；未选中时保留挂载但透明 + 不可点
   （动画可走完，不闪）。顶栏 batchMsg 代用品已退役（HeroUI toast 接管反馈）。 */
export function SelectionActionBar({
  count,
  countLabel,
  onClear,
  children,
  label,
}: {
  count: number;
  countLabel: string;
  onClear: () => void;
  children?: ReactNode;
  label: string;
}) {
  const visible = count > 0;
  return (
    <div
      className={`pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transition-all duration-200 ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      aria-hidden={!visible}
    >
      <Toolbar
        aria-label={label}
        className="pointer-events-auto flex items-center gap-2 rounded-full border bg-surface px-2 py-1.5 shadow-overlay"
      >
        <Chip size="sm" variant="soft" color="default">
          {countLabel}
        </Chip>
        {children && (
          <>
            <Separator orientation="vertical" />
            <span className="flex items-center gap-1">{children}</span>
          </>
        )}
        <Separator orientation="vertical" />
        <HeroButton isIconOnly size="sm" variant="ghost" onPress={onClear} aria-label="清除选择">
          <Icon name="x" size={15} />
        </HeroButton>
      </Toolbar>
    </div>
  );
}

/* ---------- 状态单元格 ---------- */
/* 表格状态单元格用免费 Chip（size=sm variant=soft）；violet（色情 /
   辱骂攻击）与 dark（主厂商）在 Chip 调色板里没有等价色，保留 ui Badge，
   不悄悄改 13 类配色。tone 与 ui BadgeTone 同集。 */
const CHIP_COLOR: Record<Exclude<StatusTone, "violet" | "dark">, "default" | "accent" | "success" | "danger" | "warning"> = {
  neutral: "default",
  accent: "accent",
  success: "success",
  danger: "danger",
  warning: "warning",
};
export function StatusChip({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  if (tone === "violet" || tone === "dark") return <Badge tone={tone}>{children}</Badge>;
  return (
    <Chip size="sm" variant="soft" color={CHIP_COLOR[tone]}>
      {children}
    </Chip>
  );
}

/* ---------- 加载更多哨兵行 ---------- */
/* 无限滚动用哨兵行 + 免费 Spinner：行内一格跨列，加载中转圈。当前各表
   均用分页，暂无调用；基建就绪，供以后上拉加载的表复用。 */
export function SentinelRow({ colSpan, loading, label = "正在加载更多…" }: { colSpan: number; loading: boolean; label?: string }) {
  if (!loading) return null;
  return (
    <tr aria-live="polite">
      <td colSpan={colSpan} className="border-b border-[var(--border)] px-4 py-3.5 text-center">
        <span className="inline-flex items-center gap-2 text-xs text-[var(--dim)]">
          <Spinner size="sm" />
          {label}
        </span>
      </td>
    </tr>
  );
}

/* 哨兵交叉观察：目标行进入视口即回调（调用方据此拉下一页）；只在
   enabled 时挂观察，卸载即断开。 */
export function useLoadMoreSentinel(ref: { current: HTMLElement | null }, onLoadMore: () => void, enabled: boolean) {
  const saved = useRef(onLoadMore);
  saved.current = onLoadMore;
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const ob = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) saved.current();
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, [ref, enabled]);
}

export type { ColumnVisibilityState, PaginationState, RowSelectionState, SortingState };
