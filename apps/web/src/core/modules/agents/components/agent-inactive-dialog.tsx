"use client";

import { BookOpen, Settings, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName?: string;
  /** When true, closing the dialog redirects to /onboarding instead of just hiding it. */
  blocking?: boolean;
};

export function AgentInactiveDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
  blocking,
}: Props) {
  const router = useRouter();
  const basePath = `/dashboard/workspace/agents/${agentId}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && blocking) {
          router.push(`${basePath}/onboarding`);
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-[460px]"
        showCloseButton={!blocking}
        onPointerDownOutside={(event) => {
          if (blocking) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (blocking) event.preventDefault();
        }}
      >
        <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--r-full)] bg-[var(--accent-soft)] text-[var(--accent)] animate-in fade-in-0 zoom-in-95 duration-300">
          <Sparkles className="size-5" />
        </div>
        <DialogHeader>
          <DialogTitle>Agente ainda não está ativo</DialogTitle>
          <DialogDescription>
            Antes de usar{" "}
            <span className="font-medium text-[var(--fg-primary)]">
              {agentName ?? "este agente"}
            </span>
            , finalize a configuração inicial e revise os parâmetros básicos.
            Você precisa garantir que o contexto e os dados principais estão
            prontos antes de abrir novas conversas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] text-[var(--accent)]">
                <BookOpen className="size-3.5" />
              </div>
              <p className="text-[12.5px] font-medium text-[var(--fg-primary)]">
                Onboarding
              </p>
            </div>
            <p className="mt-2 text-[11.5px] leading-[1.5] text-[var(--fg-tertiary)]">
              Complete a configuração inicial do agente antes de conversar com ele.
            </p>
          </div>
          <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] text-[var(--accent)]">
                <Settings className="size-3.5" />
              </div>
              <p className="text-[12.5px] font-medium text-[var(--fg-primary)]">
                Configurações
              </p>
            </div>
            <p className="mt-2 text-[11.5px] leading-[1.5] text-[var(--fg-tertiary)]">
              Defina nome, descrição e parâmetros básicos do agente.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              router.push(`${basePath}/settings`);
            }}
          >
            <Settings className="size-3.5" />
            Configurações
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              router.push(`${basePath}/onboarding`);
            }}
          >
            <BookOpen className="size-3.5" />
            Abrir onboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
