'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  BriefcaseBusiness,
  CircleAlert,
  ExternalLink,
  FileSearch,
  Globe,
  ImageIcon,
  NotepadText,
  PlugZap,
} from 'lucide-react';
import { useAbility } from 'src/core/modules/organization/hooks/use-ability';
import { Badge } from 'src/core/shared/components/ui/badge';
import { Button } from 'src/core/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/core/shared/components/ui/card';
import { DataTable } from 'src/core/shared/components/ui/data-table';

type ConnectorCard = {
  id: string;
  name: string;
  description: string;
  group: 'context-source' | 'publishing-channel';
  status: 'available' | 'coming-soon';
  icon: typeof Globe;
};

type FutureConnection = {
  id: string;
  connector: string;
  role: string;
  status: string;
  note: string;
};

const connectors: ConnectorCard[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    description:
      'Trazer materiais e referências do workspace do cliente para enriquecer contexto e operação.',
    group: 'context-source',
    status: 'available',
    icon: FileSearch,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Ler documentação viva, processos e materiais estratégicos da empresa.',
    group: 'context-source',
    status: 'available',
    icon: NotepadText,
  },
  {
    id: 'website-crawl',
    name: 'Website / Crawl',
    description:
      'Importar site institucional, páginas e sinais públicos de posicionamento da marca.',
    group: 'context-source',
    status: 'available',
    icon: Globe,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description:
      'Preparar publicação futura de conteúdo e referências visuais da presença atual da marca.',
    group: 'publishing-channel',
    status: 'coming-soon',
    icon: ImageIcon,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Canal futuro de publicação para conteúdo B2B, institucional e comercial.',
    group: 'publishing-channel',
    status: 'coming-soon',
    icon: BriefcaseBusiness,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Canal futuro para distribuição e reaproveitamento de criativos e campanhas.',
    group: 'publishing-channel',
    status: 'coming-soon',
    icon: ExternalLink,
  },
];

const futureConnections: FutureConnection[] = [];

const connectionColumns: ColumnDef<FutureConnection>[] = [
  {
    accessorKey: 'connector',
    header: 'Conector',
  },
  {
    accessorKey: 'role',
    header: 'Papel',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
  },
  {
    accessorKey: 'note',
    header: 'Observação',
  },
];

function EmptyPermissionState() {
  return (
    <Card>
      <CardHeader className="p-6">
        <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
          Você não tem acesso às integrações
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 text-[14px] text-[var(--fg-secondary)]">
        O acesso a esta central depende de permissão específica do workspace.
      </CardContent>
    </Card>
  );
}

export function IntegrationsPage() {
  const { can, isLoading } = useAbility();
  const canReadIntegrations = can('read', 'Integration');
  const contextConnectors = connectors.filter((connector) => connector.group === 'context-source');
  const publishingConnectors = connectors.filter(
    (connector) => connector.group === 'publishing-channel',
  );

  if (!isLoading && !canReadIntegrations) {
    return <EmptyPermissionState />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
          Workspace
        </p>
        <h1 className="mt-1 text-[28px] font-medium tracking-[-0.02em] text-[var(--fg-primary)]">
          Integrações
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] text-[var(--fg-tertiary)]">
          Estruture fontes de contexto e canais de publicação com a mesma governança do restante do
          workspace. Nesta fase, a experiência já está pronta para crescer, mesmo sem conexões reais
          ainda.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
              Fontes de contexto
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-6 pb-6 pt-0">
            {contextConnectors.map((connector) => {
              const Icon = connector.icon;
              return (
                <div
                  key={connector.id}
                  className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-[var(--r-sm)] bg-[var(--bg-sunken)] p-2">
                        <Icon className="size-4 text-[var(--fg-secondary)]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                          {connector.name}
                        </p>
                        <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
                          {connector.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Disponível</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
              Canais de publicação
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-6 pb-6 pt-0">
            {publishingConnectors.map((connector) => {
              const Icon = connector.icon;
              return (
                <div
                  key={connector.id}
                  className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-[var(--r-sm)] bg-[var(--bg-sunken)] p-2">
                        <Icon className="size-4 text-[var(--fg-secondary)]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                          {connector.name}
                        </p>
                        <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
                          {connector.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Em breve</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
              Conexões do workspace
            </CardTitle>
            <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
              Esta visão operacional vai concentrar status, escopo e saúde das conexões ativas
              quando o backend das integrações for implementado.
            </p>
          </div>
          <Button variant="outline" disabled>
            <PlugZap className="size-4" />
            Conectar provider
          </Button>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          {futureConnections.length > 0 ? (
            <DataTable
              columns={connectionColumns}
              data={futureConnections}
              enablePagination={false}
            />
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[var(--r-lg)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] text-center">
              <CircleAlert className="size-6 text-[var(--fg-tertiary)]" />
              <div>
                <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                  Nenhuma conexão ativa ainda
                </p>
                <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
                  O catálogo já prepara as próximas integrações do produto, mas a operação real
                  entra na próxima fase.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
