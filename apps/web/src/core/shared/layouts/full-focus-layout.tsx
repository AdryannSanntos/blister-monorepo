"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "src/core/shared/components/ui/button";

type FullFocusLayoutProps = {
  sidebar?: ReactNode;
  sidebarWidth?: string;
  children: ReactNode;
};

export function FullFocusLayout({
  sidebar,
  sidebarWidth = "w-72",
  children,
}: FullFocusLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--bg-canvas)] text-[var(--fg-primary)]">
      {sidebar && sidebarOpen && (
        <aside
          className={`${sidebarWidth} shrink-0 border-r border-[var(--line-subtle)] bg-[var(--bg-base)]`}
        >
          <div className="flex h-full flex-col overflow-y-auto">{sidebar}</div>
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--line-subtle)] px-4">
          {sidebar && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
