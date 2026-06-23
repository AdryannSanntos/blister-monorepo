"use client";

import type { AppPermissionKey } from "@company-os/authz";
import {
  type ColumnDef,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Columns3,
  Download,
  FileText,
  Inbox,
  SlidersHorizontal,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Button } from "src/core/shared/components/ui/button";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { TableEmptyState } from "src/core/shared/components/ui/empty-state";
import { SurfaceIcon } from "src/core/shared/components/ui/surface-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/core/shared/components/ui/table";
import { cn } from "src/core/shared/utils";

type DataTableFilterOption<TData> = {
  label: string;
  value: string;
  predicate: (row: TData) => boolean;
};

type DataTableFilter<TData> = {
  id: string;
  label: string;
  defaultValue?: string;
  options: DataTableFilterOption<TData>[];
};

type DataTableExportColumn<TData> = {
  id: string;
  label: string;
  value: (row: TData) => string | number | boolean | null | undefined;
};

type DataTableBulkAction<TData> = {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "ghost" | "destructive" | "outline" | "secondary";
  permission?: AppPermissionKey;
  onClick: (rows: TData[]) => void | Promise<void>;
};

type DataTableEmptyState = {
  icon?: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
};

type DataTableExportOptions<TData> = {
  fileName: string;
  title: string;
  columns: DataTableExportColumn<TData>[];
};

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  containerClassName?: string;
  /** Integrated panel title — rendered with `icon` inside the table container header. */
  title: string;
  icon: LucideIcon;
  description?: string;
  toolbarStart?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
  filters?: DataTableFilter<TData>[];
  /** Controlled filter values — keys must match filter ids. Falls back to internal state when omitted. */
  filterValues?: Record<string, string>;
  onFilterValuesChange?: (values: Record<string, string>) => void;
  bulkActions?: DataTableBulkAction<TData>[];
  exportOptions?: DataTableExportOptions<TData>;
  emptyState?: DataTableEmptyState;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  pageSize?: number;
  /** Controlled page index (0-based). Requires enablePagination. Falls back to internal state when omitted. */
  pageIndex?: number;
  onPageIndexChange?: (page: number) => void;
  getRowId?: (originalRow: TData, index: number) => string;
};

function getColumnLabel<TData>(column: TanStackTable<TData>["getAllLeafColumns"] extends () => Array<infer TColumn> ? TColumn : never) {
  const columnDef = column.columnDef as { header?: unknown; meta?: { label?: string } };
  if (columnDef.meta?.label) return columnDef.meta.label;
  if (typeof columnDef.header === "string") return columnDef.header;
  return column.id;
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(fileName: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function exportCsv<TData>(rows: TData[], options: DataTableExportOptions<TData>) {
  const header = options.columns.map((column) => escapeCsvCell(column.label)).join(",");
  const body = rows
    .map((row) => options.columns.map((column) => escapeCsvCell(column.value(row))).join(","))
    .join("\n");
  downloadBlob(`${options.fileName}.csv`, "text/csv;charset=utf-8", `${header}\n${body}`);
}

function exportPdf<TData>(rows: TData[], options: DataTableExportOptions<TData>) {
  const htmlRows = rows
    .map(
      (row) =>
        `<tr>${options.columns
          .map((column) => `<td>${String(column.value(row) ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><title>${options.title}</title><style>body{font-family:system-ui,sans-serif;padding:32px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f6f6f6}</style><script>window.onload=function(){window.focus();window.print();}<\/script></head><body><h1>${options.title}</h1><table><thead><tr>${options.columns.map((column) => `<th>${column.label}</th>`).join("")}</tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}

function DataTable<TData, TValue>({
  columns,
  data,
  className,
  containerClassName,
  title,
  description,
  icon,
  toolbarStart,
  toolbarEnd,
  filters = [],
  filterValues,
  onFilterValuesChange,
  bulkActions = [],
  exportOptions,
  emptyState,
  enablePagination = false,
  enableRowSelection,
  pageSize = 10,
  pageIndex,
  onPageIndexChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [internalFilters, setInternalFilters] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((filter) => [filter.id, filter.defaultValue ?? "all"])),
  );
  const [pagination, setPagination] = React.useState({ pageIndex: pageIndex ?? 0, pageSize });
  const [footerPortalTarget, setFooterPortalTarget] = React.useState<Element | null>(null);

  // Sync external pageIndex into internal pagination state
  React.useEffect(() => {
    if (pageIndex !== undefined) {
      setPagination((prev) => ({ ...prev, pageIndex }));
    }
  }, [pageIndex]);

  const resolvedFilters = filterValues ?? internalFilters;

  function updateFilters(id: string, value: string) {
    const next = { ...resolvedFilters, [id]: value };
    setInternalFilters(next);
    onFilterValuesChange?.(next);
  }

  React.useEffect(() => {
    setFooterPortalTarget(document.getElementById("dashboard-content"));
  }, []);

  const shouldEnableSelection = enableRowSelection ?? Boolean(bulkActions.length || exportOptions);

  const filteredData = React.useMemo(
    () =>
      data.filter((row) =>
        filters.every((filter) => {
          const value = resolvedFilters[filter.id] ?? filter.defaultValue ?? "all";
          if (value === "all") return true;
          return filter.options.find((option) => option.value === value)?.predicate(row) ?? true;
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedFilters, data, filters],
  );

  const selectionColumn = React.useMemo<ColumnDef<TData, TValue>>(
    () => ({
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label="Selecionar todos"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label="Selecionar linha"
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    } as ColumnDef<TData, TValue>),
    [],
  );

  const tableColumns = React.useMemo(
    () => (shouldEnableSelection ? [selectionColumn, ...columns] : columns),
    [columns, selectionColumn, shouldEnableSelection],
  );

  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    getRowId,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    enableRowSelection: shouldEnableSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      ...(enablePagination ? { pagination } : {}),
    },
    onPaginationChange: enablePagination
      ? (updater) => {
          setPagination((current) => {
            const next = typeof updater === "function" ? updater(current) : updater;
            if (next.pageIndex !== current.pageIndex) {
              onPageIndexChange?.(next.pageIndex);
            }
            return next;
          });
        }
      : undefined,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((row: Row<TData>) => row.original);
  const columnToggleItems = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() && column.id !== "select" && column.id !== "actions");
  const hasPanelHeader = Boolean(
    title || description || filters.length || toolbarStart || toolbarEnd || columnToggleItems.length,
  );
  const defaultBulkActions: DataTableBulkAction<TData>[] = exportOptions
    ? [
        { id: "export-csv", label: "Exportar CSV", icon: Download, variant: "ghost", onClick: (rows) => exportCsv(rows, exportOptions) },
        { id: "export-pdf", label: "Exportar PDF", icon: FileText, variant: "ghost", onClick: (rows) => exportPdf(rows, exportOptions) },
      ]
    : [];
  const footerActions = [...defaultBulkActions, ...bulkActions];
  const EmptyIcon = emptyState?.icon ?? Inbox;

  const panelControls = (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
      {toolbarStart}
      {filters.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Filtrar tabela">
              <SlidersHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filtros</DropdownMenuLabel>
            {filters.map((filter) => (
              <DropdownMenuSub key={filter.id}>
                <DropdownMenuSubTrigger>{filter.label}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={resolvedFilters[filter.id] ?? filter.defaultValue ?? "all"}
                    onValueChange={(value) => updateFilters(filter.id, value)}
                  >
                    <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                    {filter.options.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {toolbarEnd}
      {columnToggleItems.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Configurar colunas">
              <Columns3 className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Colunas</DropdownMenuLabel>
            {columnToggleItems.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
              >
                {getColumnLabel<TData>(column)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );

  return (
    <div data-slot="data-table" className={cn("relative flex flex-col gap-3", className)}>
      <div
        data-testid="data-table-panel"
        data-has-panel-header={hasPanelHeader ? "true" : undefined}
        className={cn(
          "overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]",
          hasPanelHeader &&
            "[&_[data-slot=table-head]]:first:rounded-tl-none [&_[data-slot=table-head]]:last:rounded-tr-none",
          containerClassName,
        )}
      >
        {hasPanelHeader ? (
          <div
            data-testid="data-table-panel-header"
            className="flex flex-col gap-3 border-b border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            {title || icon || description ? (
              <div
                data-testid="data-table-heading"
                className="flex min-w-0 items-center gap-3"
              >
                <SurfaceIcon
                  icon={icon}
                  data-testid="data-table-surface-icon"
                  className="size-9 rounded-[var(--r-sm)]"
                  iconClassName="size-4"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-semibold text-[var(--fg-primary)]">
                    {title}
                  </h3>
                  {description ? (
                    <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">{description}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}
            {panelControls}
          </div>
        ) : null}

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  const isCompact = header.column.id === "select" || header.column.id === "actions";
                  return (
                    <TableHead key={header.id} className={cn(isCompact && "w-px text-center")}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="-mx-1 inline-flex items-center gap-1 rounded-[var(--r-sm)] px-1 py-0.5 text-left uppercase transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)]"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDir === "asc" ? (
                            <ChevronUp className="size-3 text-[var(--fg-tertiary)]" />
                          ) : sortDir === "desc" ? (
                            <ChevronDown className="size-3 text-[var(--fg-tertiary)]" />
                          ) : (
                            <ChevronsUpDown className="size-3 text-[var(--fg-quaternary)]" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => {
                    const isCompact = cell.column.id === "select" || cell.column.id === "actions";
                    return (
                      <TableCell key={cell.id} className={cn(isCompact && "w-px text-center align-middle")}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableEmptyState
                colSpan={table.getVisibleLeafColumns().length}
                icon={EmptyIcon}
                title={emptyState?.title ?? "Nenhum registro encontrado"}
                description={emptyState?.description ?? "Ajuste os filtros ou crie o primeiro registro."}
                action={emptyState?.action}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between gap-3 text-[12px] text-[var(--fg-tertiary)]">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} · {table.getFilteredRowModel().rows.length} registros
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Próxima
            </Button>
          </div>
        </div>
      ) : null}

      {selectedRows.length > 0 && footerActions.length > 0 && footerPortalTarget
        ? createPortal(
            <div className="animate-in slide-in-from-bottom-3 fade-in sticky bottom-0 z-50 flex justify-center px-8 pb-6 duration-[var(--dur-base)]">
              <div className="flex items-center gap-2 rounded-[var(--r-xl)] border border-[var(--line-strong)] bg-[var(--bg-overlay)] px-3 py-2 shadow-[var(--shadow-xl)]">
                <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--accent-soft)] px-3 py-1.5">
                  <span className="text-[13px] font-semibold tabular-nums text-[var(--accent)]">
                    {selectedRows.length}
                  </span>
                  <span className="text-[12px] text-[var(--fg-tertiary)]">
                    {selectedRows.length === 1 ? "selecionado" : "selecionados"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRowSelection({})}
                  className="flex size-7 items-center justify-center rounded-[var(--r-md)] text-[var(--fg-quaternary)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-secondary)]"
                  aria-label="Limpar seleção"
                >
                  <X className="size-3.5" />
                </button>
                <div className="mx-1 h-5 w-px bg-[var(--line-strong)]" />
                {footerActions.map((action) => {
                  const Icon = action.icon ?? (action.variant === "destructive" ? Trash2 : undefined);
                  const button = (
                    <Button key={action.id} variant={action.variant ?? "ghost"} size="sm" onClick={() => action.onClick(selectedRows)}>
                      {Icon ? <Icon className="size-3.5" /> : null}
                      {action.label}
                    </Button>
                  );
                  return action.permission ? <PermissionGate key={action.id} permission={action.permission}>{button}</PermissionGate> : button;
                })}
              </div>
            </div>,
            footerPortalTarget,
          )
        : null}
    </div>
  );
}

export {
  DataTable,
  type ColumnDef,
  type DataTableBulkAction,
  type DataTableExportColumn,
  type DataTableFilter,
};
