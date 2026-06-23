"use client";

import type { AdminMarketplaceItemDto } from "@company-os/types";
import { Edit2, Plus, Power, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { TableRowActionsMenu } from "src/core/shared/components/ui/table-row-actions-menu";

import { MarketplaceAdminItemDialog } from "../components/marketplace-admin-item-dialog";
import {
  useAdminMarketplaceItems,
  useSetMarketplaceItemActive,
} from "../hooks/use-marketplace-admin";
import { getMarketplaceTypeLabelKey } from "../utils/marketplace-catalog.utils";

function ItemRowActions({
  item,
  onEdit,
  onToggleActive,
  isPending,
}: {
  item: AdminMarketplaceItemDto;
  onEdit: (item: AdminMarketplaceItemDto) => void;
  onToggleActive: (item: AdminMarketplaceItemDto) => void;
  isPending: boolean;
}) {
  const t = useTranslations("marketplaceAdmin");

  return (
    <TableRowActionsMenu
      ariaLabel={t("actionsColumn")}
      items={[
        {
          id: "edit",
          label: t("edit"),
          icon: Edit2,
          onClick: () => onEdit(item),
        },
        {
          id: "toggle-active",
          label: item.isActive ? t("deactivate") : t("activate"),
          icon: Power,
          onClick: () => onToggleActive(item),
          disabled: isPending,
        },
      ]}
    />
  );
}

export function MarketplaceAdminPage() {
  const t = useTranslations("marketplaceAdmin");
  const tMarketplace = useTranslations("marketplace");
  const itemsQuery = useAdminMarketplaceItems();
  const setActive = useSetMarketplaceItemActive();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMarketplaceItemDto | null>(
    null,
  );

  const items = itemsQuery.data ?? [];
  const isLoading = itemsQuery.isLoading;

  const handleToggleActive = useCallback(
    async (item: AdminMarketplaceItemDto) => {
      try {
        await setActive.mutateAsync({
          id: item.id,
          payload: { isActive: !item.isActive },
        });
        toast.success(t("statusSuccess"));
      } catch {
        toast.error(t("saveFailed"));
      }
    },
    [setActive, t],
  );

  const columns: ColumnDef<AdminMarketplaceItemDto>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("nameColumn"),
        meta: { label: t("nameColumn") },
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-[var(--fg-primary)]">
              {row.original.name}
            </p>
            <p className="text-[12px] text-[var(--fg-tertiary)]">
              {row.original.slug}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: t("typeColumn"),
        meta: { label: t("typeColumn") },
        cell: ({ row }) =>
          tMarketplace(getMarketplaceTypeLabelKey(row.original.type)),
      },
      {
        accessorKey: "price",
        header: t("priceColumn"),
        meta: { label: t("priceColumn") },
        cell: ({ row }) => row.original.price,
      },
      {
        accessorKey: "isActive",
        header: t("statusColumn"),
        meta: { label: t("statusColumn") },
        cell: ({ row }) => (
          <Badge
            variant={row.original.isActive ? "default" : "secondary"}
            className="text-[11px]"
          >
            {row.original.isActive ? t("active") : t("inactive")}
          </Badge>
        ),
      },
    ],
    [t, tMarketplace],
  );

  const tableColumns = useMemo<ColumnDef<AdminMarketplaceItemDto>[]>(
    () => [
      ...columns,
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <ItemRowActions
            item={row.original}
            onEdit={setEditingItem}
            onToggleActive={handleToggleActive}
            isPending={setActive.isPending}
          />
        ),
      },
    ],
    [columns, handleToggleActive, setActive.isPending],
  );

  return (
    <div data-testid="marketplace-admin-page">
      <PageLayout
        icon={Store}
        title={t("title")}
        description={t("description")}
        backButton={{
          href: "/dashboard/marketplace",
          label: t("backToMarketplace"),
        }}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t("newItem")}
          </Button>
        }
      >
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <DataTable
            title={t("title")}
            icon={Store}
            columns={tableColumns}
            data={items}
            exportOptions={{
              fileName: "marketplace-admin-items",
              title: t("title"),
              columns: [
                {
                  id: "name",
                  label: t("nameColumn"),
                  value: (row) => row.name,
                },
                {
                  id: "slug",
                  label: t("slug"),
                  value: (row) => row.slug,
                },
                {
                  id: "type",
                  label: t("typeColumn"),
                  value: (row) => row.type,
                },
                {
                  id: "price",
                  label: t("priceColumn"),
                  value: (row) => row.price,
                },
                {
                  id: "status",
                  label: t("statusColumn"),
                  value: (row) => (row.isActive ? t("active") : t("inactive")),
                },
              ],
            }}
            emptyState={{
              icon: Store,
              title: t("title"),
              description: t("description"),
              action: (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  {t("newItem")}
                </Button>
              ),
            }}
          />
        )}
      </PageLayout>

      <MarketplaceAdminItemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <MarketplaceAdminItemDialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem ?? undefined}
      />
    </div>
  );
}
