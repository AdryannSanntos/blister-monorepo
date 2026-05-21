'use client';

import { CheckCircle2, FileText, Loader2, XCircle } from 'lucide-react';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Badge } from 'src/core/shared/components/ui/badge';
import { Button } from 'src/core/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'src/core/shared/components/ui/card';
import { cn } from 'src/core/shared/utils';
import type { ContextArtifact } from '../hooks/use-context-sources';
import { useSyncContextArtifact } from '../hooks/use-context-sources';

type Props = { artifact: ContextArtifact; orgId: string | null };

export function ContextArtifactTab({ artifact, orgId }: Props) {
  const sync = useSyncContextArtifact(orgId);
  const status = artifact?.syncStatus ?? 'idle';

  const statusConfig = {
    idle: {
      label: 'Não sincronizado',
      description: 'O artefato context.md ainda não foi gerado para esta organização.',
      icon: FileText,
      className: 'text-[var(--fg-tertiary)]',
    },
    syncing: {
      label: 'Sincronizando',
      description: 'O pipeline de composição está rodando. Isso pode levar alguns segundos.',
      icon: Loader2,
      className: 'text-[var(--accent)] animate-spin',
    },
    synced: {
      label: 'Sincronizado',
      description: `${artifact?.sourceCount ?? 0} fonte${(artifact?.sourceCount ?? 0) !== 1 ? 's aprovadas compõem' : ' aprovada compõe'} o contexto atual.`,
      icon: CheckCircle2,
      className: 'text-[var(--success)]',
    },
    error: {
      label: 'Erro na sincronização',
      description: artifact?.syncError ?? 'Ocorreu um erro ao gerar o artefato.',
      icon: XCircle,
      className: 'text-[var(--danger)]',
    },
  }[status];

  const Icon = statusConfig.icon;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)]',
                )}
              >
                <Icon className={cn('size-4', statusConfig.className)} />
              </div>
              <div>
                <CardTitle className="text-[15px]">context.md</CardTitle>
                <CardDescription className="mt-0.5 text-[13px]">
                  {statusConfig.description}
                </CardDescription>
                {artifact?.syncedAt && (
                  <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
                    Última sincronização:{' '}
                    {new Date(artifact.syncedAt).toLocaleString('pt-BR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </div>
            </div>
            <PermissionGate permission="context.publish">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sync.mutate()}
                disabled={sync.isPending || status === 'syncing'}
              >
                {sync.isPending || status === 'syncing' ? 'Sincronizando…' : 'Sincronizar agora'}
              </Button>
            </PermissionGate>
          </div>
        </CardHeader>

        {artifact?.objectKey && (
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
              <FileText className="size-3.5 text-[var(--fg-tertiary)]" />
              <span className="font-mono text-[12px] text-[var(--fg-secondary)]">
                {artifact.objectKey}
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[13px] text-[var(--fg-secondary)]">
          <div className="flex gap-3">
            <Badge variant="secondary" className="mt-0.5 shrink-0 tabular-nums">1</Badge>
            <p>
              <strong className="text-[var(--fg-primary)]">Adicionar fontes</strong> — Envie
              arquivos, URLs ou texto manual para o pipeline.
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="mt-0.5 shrink-0 tabular-nums">2</Badge>
            <p>
              <strong className="text-[var(--fg-primary)]">Pipeline automático</strong> — O sistema
              ingere e extrai o conteúdo, colocando a fonte em revisão.
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="mt-0.5 shrink-0 tabular-nums">3</Badge>
            <p>
              <strong className="text-[var(--fg-primary)]">Revisão humana</strong> — Aprove ou
              rejeite cada fonte antes que ela entre no contexto oficial.
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="mt-0.5 shrink-0 tabular-nums">4</Badge>
            <p>
              <strong className="text-[var(--fg-primary)]">Composição do artefato</strong> — As
              fontes aprovadas + o Brain inicial geram o{' '}
              <code className="rounded bg-[var(--bg-sunken)] px-1 py-0.5 font-mono text-[11px]">
                context.md
              </code>{' '}
              usado pelos agentes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
