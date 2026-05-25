"use client";

import { Shield } from "lucide-react";

export function PlatformAdminHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
        <Shield className="size-5" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-[var(--fg-primary)]">
          Platform Admin
        </h1>
        <p className="text-xs text-[var(--fg-tertiary)]">
          Gestão de acesso, custos e modelos de IA da plataforma
        </p>
      </div>
    </div>
  );
}
