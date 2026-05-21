"use client";

import { CheckCircle2, FileText, Loader2, RefreshCw, XCircle } from "lucide-react";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Card, CardContent } from "src/core/shared/components/ui/card";
import { cn } from "src/core/shared/utils";
import type { ContextArtifact } from "../hooks/use-context-sources";
import { useSyncContextArtifact } from "../hooks/use-context-sources";

type ArtifactData = NonNullable<ContextArtifact>;

type Props = {
  orgId: string | null;
  artifact: ContextArtifact;
};

function StatusBadge({ status }: { status: ArtifactData["syncStatus"] }) {
  const map: Record<ArtifactData["syncStatus"], { label: string; className: string }> = {
    idle: { label: "Não sincronizado", className: "bg-muted text-muted-foreground" },
    syncing: { label: "Sincronizando…", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
    synced: { label: "Sincronizado", className: "bg-green-500/15 text-green-600 dark:text-green-400" },
    error: { label: "Erro", className: "bg-destructive/15 text-destructive" },
  };

  const { label, className } = map[status];
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", className)}>
      {status === "syncing" && <Loader2 className="mr-1 size-3 animate-spin" />}
      {status === "synced" && <CheckCircle2 className="mr-1 size-3" />}
      {status === "error" && <XCircle className="mr-1 size-3" />}
      {label}
    </Badge>
  );
}

export function ContextArtifactPanel({ orgId, artifact }: Props) {
  const sync = useSyncContextArtifact(orgId);

  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">context.md</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={artifact?.syncStatus ?? "idle"} />
              {artifact?.syncedAt && (
                <span className="text-xs text-muted-foreground">
                  Sincronizado{" "}
                  {new Date(artifact.syncedAt).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {artifact?.sourceCount !== undefined && artifact.sourceCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {artifact.sourceCount} fonte{artifact.sourceCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {artifact?.syncError && (
              <span className="text-xs text-destructive">{artifact.syncError}</span>
            )}
          </div>
        </div>

        <PermissionGate permission="context.publish">
          <Button
            size="sm"
            variant="outline"
            onClick={() => sync.mutate()}
            disabled={sync.isPending || artifact?.syncStatus === "syncing"}
          >
            <RefreshCw className={cn("mr-2 size-3.5", sync.isPending && "animate-spin")} />
            Sincronizar
          </Button>
        </PermissionGate>
      </CardContent>
    </Card>
  );
}
