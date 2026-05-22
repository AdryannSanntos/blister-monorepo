import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
          Workspace
        </p>
        <h1 className="mt-1 text-[28px] font-medium tracking-[-0.02em] text-[var(--fg-primary)]">
          Notificações
        </h1>
        <p className="mt-2 text-[14px] text-[var(--fg-tertiary)]">
          Acompanhe eventos, convites e atualizações do seu workspace.
        </p>
      </div>

      <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[var(--r-lg)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] text-center">
        <Bell className="size-6 text-[var(--fg-tertiary)]" />
        <div>
          <p className="text-[13px] font-medium text-[var(--fg-primary)]">
            Nenhuma notificação ainda
          </p>
          <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
            Notificações de execuções, convites e eventos aparecerão aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
