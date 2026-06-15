"use client";

import { type LucideIcon, MoreHorizontal } from "lucide-react";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";

export type TableRowActionItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

type TableRowActionsMenuProps = {
  items: TableRowActionItem[];
  ariaLabel: string;
};

export function TableRowActionsMenu({
  items,
  ariaLabel,
}: TableRowActionsMenuProps) {
  const visibleItems = items.filter((item) => !item.hidden);

  if (visibleItems.length === 0) return null;

  const regularItems = visibleItems.filter((item) => !item.destructive);
  const destructiveItems = visibleItems.filter((item) => item.destructive);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={ariaLabel}
            className="size-8"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {regularItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              disabled={item.disabled}
              onSelect={() => item.onClick()}
            >
              {item.icon ? <item.icon className="size-4" /> : null}
              {item.label}
            </DropdownMenuItem>
          ))}
          {regularItems.length > 0 && destructiveItems.length > 0 ? (
            <DropdownMenuSeparator />
          ) : null}
          {destructiveItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              variant="destructive"
              disabled={item.disabled}
              onSelect={() => item.onClick()}
            >
              {item.icon ? <item.icon className="size-4" /> : null}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
