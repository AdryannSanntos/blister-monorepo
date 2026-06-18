# Blister OS — Limpeza Geral e Correções de Bugs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir dois bugs críticos de UX e remover todo código fora do escopo do produto atual (brand brain, agentes não-cuts, RAG, rotas mortas), deixando o codebase alinhado exclusivamente com o agente de cortes.

**Architecture:** Seis tracks independentes executados em ordem de risco crescente. Cada track termina com um commit testável e reversível. Tracks 1–2 são correções de bugs. Tracks 3–4 removem módulos inteiros. Tracks 5–6 limpam resíduos de tipos e configurações.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, NestJS 11, Prisma, `packages/agent-sdk`, `packages/types`, TypeScript estrito.

## Global Constraints

- Identificadores de código sempre em inglês (nomes de função, variável, componente, hook)
- Nunca editar arquivos em `apps/api/src/generated/prisma` manualmente
- Não criar novas rotas de produto — apenas remover as fora de escopo
- Cada track é um commit atômico; não misturar tracks no mesmo commit
- O módulo RAG (`apps/api/src/rag/rag.module.ts`) deve continuar existindo após Track 4, mas zero outros módulos devem importá-lo

---

## Mapa de Arquivos

| Track | Arquivo | Ação |
|-------|---------|------|
| 1 | `apps/web/src/core/modules/auth/pages/login-page.tsx` | Modificar |
| 2 | `apps/web/src/core/modules/agents/components/cuts/cuts-run-modal-provider.tsx` | Modificar |
| 2 | `apps/web/src/core/modules/agents/components/cuts/cut-story-player.tsx` | Modificar |
| 3 | `apps/web/src/core/modules/agents/components/generations/research-generation.tsx` | Deletar |
| 3 | `apps/web/src/core/modules/agents/components/generations/video-editor-generation.tsx` | Deletar |
| 3 | `apps/web/src/core/modules/agents/components/generations/brief-agent-generation.tsx` | Deletar |
| 3 | `apps/web/src/core/modules/agents/config/agent-ui-config.ts` | Deletar |
| 3 | `apps/web/src/core/modules/research/` | Deletar dir |
| 3 | `apps/web/src/core/modules/video-editor/` | Deletar dir |
| 3 | `apps/web/src/core/modules/dashboard/hooks/use-dashboard-nav-groups.ts` | Modificar |
| 3 | `apps/web/src/core/modules/agents/pages/agent-new-page.tsx` | Modificar |
| 3 | `apps/web/src/core/modules/dashboard/config/dashboard-agents.ts` | Deletar |
| 3 | `apps/web/src/core/modules/dashboard/components/dashboard-quick-actions.tsx` | Modificar |
| 3 | `apps/web/src/core/modules/dashboard/components/dashboard-recent-activity.tsx` | Modificar |
| 4 | `apps/web/src/core/modules/brand/` | Deletar dir |
| 4 | `apps/web/src/core/modules/dashboard/components/dashboard-brand-memory-panel.tsx` | Deletar |
| 4 | `apps/web/src/app/[locale]/dashboard/(shell)/brand/page.tsx` | Deletar |
| 4 | `apps/api/src/rag/brand-brain.serializer.ts` | Deletar |
| 4 | `apps/api/src/rag/company-rag-sync.service.ts` (+spec) | Deletar |
| 4 | `apps/api/src/rag/context-pack.service.ts` | Deletar |
| 4 | `apps/api/src/rag/rag-events.service.ts` | Deletar |
| 4 | `apps/api/src/rag/rag-admin.controller.ts` | Deletar |
| 4 | `apps/api/src/agents/adapters/context-pack-builder.adapter.ts` | Deletar |
| 4 | `apps/api/src/agents/adapters/create-trigger-context-pack-builder.ts` | Deletar |
| 4 | `apps/api/src/company/brand/` | Deletar dir |
| 4 | `apps/api/src/company/rag-company.controller.ts` | Deletar |
| 4 | `apps/api/src/company/company.module.ts` | Modificar |
| 4 | `apps/api/src/agents/agents.module.ts` | Modificar |
| 4 | `apps/api/src/app.module.ts` | Modificar |
| 4 | `apps/api/src/agents/runtime/workflow-engine.service.ts` | Modificar |
| 4 | `apps/api/src/agents/runtime/kernel/trigger-providers.ts` | Modificar |
| 4 | `apps/api/src/agents/runtime/kernel/types.ts` | Modificar |
| 4 | `apps/api/src/agents/cuts/prompts/cuts.prompts.ts` | Modificar |
| 4 | `packages/agent-sdk/src/context/build-step-context.ts` | Modificar |
| 4 | `packages/agent-sdk/src/core/types.ts` | Modificar |
| 4 | `packages/agent-sdk/src/core/agent-runtime-types.ts` | Modificar |
| 4 | `packages/types/src/brand-brain-progress.ts` | Deletar |
| 4 | `packages/types/src/brand-visual.ts` | Deletar |
| 4 | `packages/types/src/brand-palette.ts` | Deletar |
| 4 | `packages/types/src/index.ts` | Modificar |
| 4 | `packages/types/src/company.ts` | Modificar |
| 5 | `apps/web/src/app/[locale]/dashboard/(shell)/campaigns/page.tsx` | Deletar |
| 5 | `apps/web/src/app/[locale]/dashboard/(shell)/pieces/page.tsx` | Deletar |
| 5 | `apps/web/src/app/[locale]/dashboard/(shell)/history/page.tsx` | Deletar |
| 5 | `apps/web/src/core/modules/history/` | Deletar dir |
| 5 | `apps/web/src/core/modules/agents/hooks/use-campaigns.ts` | Deletar |
| 5 | `apps/web/src/core/modules/agents/hooks/use-caption-styles.ts` | Deletar |
| 5 | `apps/web/src/core/modules/agents/hooks/use-agent-runs-mock.ts` | Deletar |
| 5 | `apps/web/src/core/modules/dashboard/hooks/use-company-rag-status.ts` | Deletar |
| 5 | `apps/web/src/core/modules/agents/utils/format-design-plan-preview.ts` | Deletar |
| 5 | `apps/web/src/core/modules/agents/pages/agent-overview-page.tsx` | Modificar |
| 5 | `apps/web/src/core/modules/blister-os/fixtures/recent-activity.fixture.ts` | Modificar |
| 5 | `apps/web/src/core/modules/blister-os/fixtures/agent-runs.fixture.ts` | Modificar |
| 5 | `apps/web/src/core/modules/blister-os/stores/blister-os-store.ts` | Modificar |
| 6 | `apps/api/src/ai-catalog/ai-catalog.controller.ts` | Modificar |
| 6 | `apps/api/src/ai-catalog/platform-settings.service.ts` | Modificar |
| 6 | `packages/types/src/agents.ts` | Modificar |
| 6 | `packages/types/src/ai-catalog.ts` | Modificar |

---

## Task 1: Fix Login Mobile

**Files:**
- Modify: `apps/web/src/core/modules/auth/pages/login-page.tsx`

**Interfaces:**
- Consumes: `router` do `next/navigation`, `authClient.signIn.email()`
- Produces: nada novo — apenas corrige o fluxo pós-login

- [ ] **Step 1: Adicionar `router.refresh()` após o push no `onSubmit`**

Localizar a função `onSubmit` (~linha 157) e substituir:

```typescript
// antes
persistRememberedLoginEmail(values);

router.push(getPostLoginRedirectPath(searchParams));
```

por:

```typescript
persistRememberedLoginEmail(values);

router.push(getPostLoginRedirectPath(searchParams));
router.refresh();
```

O `refresh()` força o App Router a re-buscar a sessão server-side antes de renderizar `/dashboard`. Sem ele, `authClient.useSession()` pode retornar `{ session: null, isPending: false }` por um frame no mobile (cache frio), fazendo o `AuthGuard` redirecionar de volta para login.

- [ ] **Step 2: Verificar que o build compila sem erros**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Esperado: zero erros de TS em `login-page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/core/modules/auth/pages/login-page.tsx
git commit -m "fix: add router.refresh() after post-login push to prevent mobile auth guard race"
```

---

## Task 2: Fix Freeze no Modal de Cortes

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/cuts/cuts-run-modal-provider.tsx`
- Modify: `apps/web/src/core/modules/agents/components/cuts/cut-story-player.tsx`

**Interfaces:**
- Consumes: `CutsRunModalHost`, `useCutsRunModal`, `CutsRunModal` (não mudam)
- Produces: host sempre montado, `preload="metadata"` padrão para todos os clips

**Problema:** Na primeira abertura do modal, `CutsRunModalProvider` lazily monta `CutsRunModalHost` (`hostMounted: false → true`), causando render de todo o subtree no mesmo frame em que o modal abre. O `cut-story-player.tsx` usava `preload="auto"` para clips renderizados, iniciando downloads imediatos de todos os thumbnails visíveis.

- [ ] **Step 1: Remover lazy mount — montar o host sempre**

Em `cuts-run-modal-provider.tsx`, substituir o conteúdo do componente `CutsRunModalProvider`:

```typescript
export const CutsRunModalProvider = ({ children }: { children: ReactNode }) => {
  const actionsRef = useRef<CutsRunModalActions | null>(null);

  const stableActions = useMemo<CutsRunModalActions>(
    () => ({
      handleOpen: () => {
        actionsRef.current?.handleOpen();
      },
      handleOpenRunDetails: (params) => {
        actionsRef.current?.handleOpenRunDetails(params);
      },
      handleClose: () => {
        actionsRef.current?.handleClose();
      },
    }),
    [],
  );

  return (
    <CutsRunModalActionsContext.Provider value={stableActions}>
      {children}
      <CutsRunModalHost actionsRef={actionsRef} onReady={() => {}} />
    </CutsRunModalActionsContext.Provider>
  );
};
```

Remover os imports de `useCallback`, `useEffect`, `useState` (não são mais usados). Manter `useMemo`, `useRef`, `useContext`, `createContext`, `type MutableRefObject`, `type ReactNode`.

O arquivo final de imports será:

```typescript
import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useMemo,
  useRef,
  useContext,
} from "react";
```

- [ ] **Step 2: Mudar preload de "auto" para "metadata" em `cut-story-player.tsx`**

Localizar a linha com `preload={hasRenderedClipUrl ? "auto" : "metadata"}` (~linha 107) e substituir por:

```typescript
preload="metadata"
```

`preload="metadata"` carrega apenas duração/dimensões, não o conteúdo do vídeo. O browser inicia o download completo automaticamente quando o usuário clica em play. Isso elimina os downloads paralelos de todos os clips da tabela ao abrir o modal.

- [ ] **Step 3: Verificar compilação**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Esperado: zero erros em `cuts-run-modal-provider.tsx` e `cut-story-player.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/core/modules/agents/components/cuts/cuts-run-modal-provider.tsx \
        apps/web/src/core/modules/agents/components/cuts/cut-story-player.tsx
git commit -m "fix: always mount CutsRunModalHost and use preload=metadata to prevent freeze on modal open"
```

---

## Task 3: Remover Agentes Não-Cuts (Frontend)

**Files:**
- Delete: `apps/web/src/core/modules/agents/components/generations/research-generation.tsx`
- Delete: `apps/web/src/core/modules/agents/components/generations/video-editor-generation.tsx`
- Delete: `apps/web/src/core/modules/agents/components/generations/brief-agent-generation.tsx`
- Delete: `apps/web/src/core/modules/agents/config/agent-ui-config.ts`
- Delete: `apps/web/src/core/modules/research/pages/research-page.tsx` + dir
- Delete: `apps/web/src/core/modules/video-editor/pages/video-editor-page.tsx` + dir
- Delete: `apps/web/src/core/modules/dashboard/config/dashboard-agents.ts`
- Modify: `apps/web/src/core/modules/agents/pages/agent-new-page.tsx`
- Modify: `apps/web/src/core/modules/dashboard/hooks/use-dashboard-nav-groups.ts`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-quick-actions.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-recent-activity.tsx`

**Interfaces:**
- Remove: `AgentUiId`, `AGENT_UI_CONFIG`, `AGENT_UI_IDS`, `DASHBOARD_AGENT_NAV_ITEMS`
- Mantém: `AGENTS_CATALOG`, `DEFAULT_AGENT_IDS`, `getAgentByRouteSlug`

**Atenção:** `dashboard-agents.ts` e `dashboard-recent-activity.tsx` importam de `agent-ui-config.ts`. Esses imports devem ser resolvidos antes ou simultaneamente à deleção do arquivo.

- [ ] **Step 1: Atualizar `agent-new-page.tsx` — simplificar para cuts only**

Substituir o conteúdo completo do arquivo:

```typescript
"use client";

import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { CutsNewRedirect } from "src/core/modules/agents/pages/cuts-new-redirect";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { PageLayout } from "src/core/shared/components/ui/page-layout";

type AgentNewPageProps = {
  agentSlug: string;
};

export const AgentNewPage = ({ agentSlug }: AgentNewPageProps) => {
  const t = useTranslations("agents.new");
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) {
    redirect("/dashboard");
  }

  return (
    <div data-testid="agent-new-page" data-agent={agent.routeSlug}>
      <PageLayout
        icon={agent.icon}
        title={t("title", { agent: agent.name })}
        description={t("description")}
      >
        <AgentEntitlementGate agent={agent}>
          <CutsNewRedirect />
        </AgentEntitlementGate>
      </PageLayout>
    </div>
  );
};
```

- [ ] **Step 2: Reescrever `dashboard-recent-activity.tsx` sem `AGENT_UI_CONFIG`**

Substituir o import `AGENT_UI_CONFIG` e `AgentUiId` por um import de `Scissors` do lucide-react. A atividade recente mostrará apenas runs de cuts. Substituir o conteúdo completo:

```typescript
"use client";

import type { AgentRunStatusDto } from "@company-os/types";
import { History, Scissors } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import {
  getReviewStatusLabelKey,
  getRunUserInput,
} from "src/core/modules/agents/utils/agent-run-helpers";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Button } from "src/core/shared/components/ui/button";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Badge } from "src/core/shared/components/ui/badge";

type DashboardRecentActivityProps = {
  runs: AgentRunStatusDto[];
  isLoading?: boolean;
};

function formatRunDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardRecentActivity({
  runs,
  isLoading = false,
}: DashboardRecentActivityProps) {
  const t = useTranslations("dashboard.homePage.recentActivity");
  const tStatus = useTranslations("agents.status");
  const locale = useLocale();

  const recentRuns = runs.slice(0, 6);

  return (
    <SectionCard icon={History} title={t("title")} description={t("description")}>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[72px] w-full rounded-[var(--r-md)]" />
          ))}
        </div>
      ) : recentRuns.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-[var(--fg-primary)]">
            {t("emptyTitle")}
          </p>
          <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recentRuns.map((run) => {
            const reviewKey = getReviewStatusLabelKey(run.reviewStatus);

            return (
              <div
                key={run.id}
                className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-[var(--r-sm)] bg-[var(--accent-soft)] p-1.5">
                    <Scissors className="size-4 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-medium text-[var(--fg-primary)]">
                        {run.agentId}
                      </p>
                      {reviewKey ? (
                        <Badge variant="secondary" className="text-[11px]">
                          {tStatus(reviewKey)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {run.status.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-[var(--fg-secondary)]">
                      {getRunUserInput(run) || t("untitledRun")}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-[12px] tabular-nums text-[var(--fg-tertiary)]">
                    {formatRunDate(run.createdAt, locale)}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/agents/${run.agentId}?runId=${run.id}`}>
                      {t("open")}
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/agents/cuts/history">{t("viewAll")}</Link>
        </Button>
      </div>
    </SectionCard>
  );
}
```

- [ ] **Step 3: Reescrever `dashboard-quick-actions.tsx` sem `DASHBOARD_AGENT_NAV_ITEMS`**

Substituir o conteúdo completo por uma versão que aponta apenas para cuts e remove os botões de campaigns e brand:

```typescript
"use client";

import { ArrowRight, Scissors } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { SectionCard } from "src/core/shared/components/ui/section-card";

export function DashboardQuickActions() {
  const t = useTranslations("dashboard.homePage.quickActions");

  return (
    <SectionCard
      icon={Scissors}
      title={t("title")}
      description={t("description")}
    >
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/agents/cuts/new"
          className="group flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3 transition-colors hover:border-[var(--line-default)] hover:bg-[var(--bg-hover)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-[var(--r-sm)] bg-[var(--accent-soft)] p-1.5">
              <Scissors className="size-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
                {t("cutsLabel")}
              </p>
              <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
                {t("cutsDescription")}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-[var(--fg-quaternary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--fg-secondary)]" />
        </Link>
      </div>
    </SectionCard>
  );
}
```

**Nota:** Se as chaves `cutsLabel` e `cutsDescription` não existirem no arquivo de tradução, adicione-as. Se preferir usar as chaves existentes de agents, use `{t("agents.cuts")}` e adapte conforme o namespace disponível.

- [ ] **Step 4: Atualizar `use-dashboard-nav-groups.ts` — remover `video_editor` e `research` do `STUDIO_ICONS`**

Localizar o objeto `STUDIO_ICONS` (~linha 27-31) e substituir:

```typescript
const STUDIO_ICONS = {
  cuts: Scissors,
} as const;
```

Remover imports de `Clapperboard` e `Sparkles` (não são mais usados).

- [ ] **Step 5: Deletar os arquivos fora de escopo**

```bash
rm apps/web/src/core/modules/agents/components/generations/research-generation.tsx
rm apps/web/src/core/modules/agents/components/generations/video-editor-generation.tsx
rm apps/web/src/core/modules/agents/components/generations/brief-agent-generation.tsx
rm apps/web/src/core/modules/agents/config/agent-ui-config.ts
rm -rf apps/web/src/core/modules/research/
rm -rf apps/web/src/core/modules/video-editor/
rm apps/web/src/core/modules/dashboard/config/dashboard-agents.ts
```

- [ ] **Step 6: Verificar compilação**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -40
```

Esperado: zero erros. Se houver erros de "module not found" em outros arquivos que importavam `agent-ui-config`, `research-generation`, etc., corrija-os agora removendo os imports obsoletos.

- [ ] **Step 7: Commit**

```bash
git add -A apps/web/src/core/modules/agents/ \
           apps/web/src/core/modules/research/ \
           apps/web/src/core/modules/video-editor/ \
           apps/web/src/core/modules/dashboard/
git commit -m "feat: remove non-cuts agent modules and simplify dashboard to cuts-only"
```

---

## Task 4: Remover Brand Brain e Toda Utilização de RAG

**Files:** (ver mapa de arquivos — 25+ arquivos afetados)

**Interfaces:**
- Remove de `StepExecutionContext`: `contextPack`, `brandProfile`, `campaignId`
- Remove de `CreateStepContextParams`: `brandProfile`, `contextPackBuilder`, `contextConfig`, `campaignId`
- Remove de `ExecutionKernelDeps`: `contextPackBuilder`
- Remove de `BuiltAgentDefinition`: `context?: AgentContextConfig`
- Remove de `AgentDefinition` (kernel types): `context`
- Remove de `WorkflowEngineService`: injeção de `CompanyRagSyncService`, `ContextPackService`

Esta é a task com maior superfície. Execute em sub-steps cuidadosamente — TypeScript irá guiá-lo pelos erros de compilação.

**Sub-task 4A: Deletar arquivos de serviços RAG e brand**

- [ ] **Step 1: Deletar serviços RAG e brand do backend**

```bash
# RAG services usados só pelo brand brain
rm apps/api/src/rag/brand-brain.serializer.ts
rm apps/api/src/rag/company-rag-sync.service.ts
rm apps/api/src/rag/company-rag-sync.service.spec.ts
rm apps/api/src/rag/context-pack.service.ts
rm apps/api/src/rag/rag-events.service.ts
rm apps/api/src/rag/rag-admin.controller.ts

# Adapters no agents module
rm apps/api/src/agents/adapters/context-pack-builder.adapter.ts
rm apps/api/src/agents/adapters/create-trigger-context-pack-builder.ts

# Company brand dir
rm -rf apps/api/src/company/brand/
rm apps/api/src/company/rag-company.controller.ts
```

- [ ] **Step 2: Deletar arquivos de types de brand**

```bash
rm packages/types/src/brand-brain-progress.ts
rm packages/types/src/brand-visual.ts
rm packages/types/src/brand-palette.ts
```

- [ ] **Step 3: Deletar frontend brand module e rota**

```bash
rm -rf apps/web/src/core/modules/brand/
rm apps/web/src/core/modules/dashboard/components/dashboard-brand-memory-panel.tsx
rm apps/web/src/app/[locale]/dashboard/\(shell\)/brand/page.tsx
```

**Sub-task 4B: Limpar módulos NestJS**

- [ ] **Step 4: Atualizar `company.module.ts`**

Substituir o conteúdo completo por:

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController, CompaniesController } from './company.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    forwardRef(() => StorageModule),
  ],
  controllers: [CompanyController, CompaniesController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
```

- [ ] **Step 5: Atualizar `agents.module.ts`**

Remover apenas a linha `RagModule,` do array `imports` e o import correspondente no topo. O resto do módulo permanece igual.

Remover do arquivo:
```typescript
import { RagModule } from '../rag/rag.module';
```
e remover `RagModule,` do array `imports: [...]`.

- [ ] **Step 6: Atualizar `app.module.ts`**

Remover apenas a linha `RagModule,` do array `imports` e o import correspondente.

Remover do arquivo:
```typescript
import { RagModule } from './rag/rag.module';
```
e remover `RagModule,` do array `imports: [...]`.

**Sub-task 4C: Limpar WorkflowEngineService**

- [ ] **Step 7: Limpar `workflow-engine.service.ts`**

Remover os seguintes imports do topo do arquivo:
```typescript
import { CompanyRagSyncService } from '../../rag/company-rag-sync.service';
import { ContextPackService } from '../../rag/context-pack.service';
import { adaptContextPackService } from '../adapters/context-pack-builder.adapter';
```

Remover `createTriggerImageProvider` do import do kernel (linha ~19):
```typescript
// antes
import {
  type ExecutionDependencies,
  createTriggerImageProvider,
  createTriggerLlmProvider,
  executeRun,
} from './kernel';

// depois
import {
  type ExecutionDependencies,
  createTriggerLlmProvider,
  executeRun,
} from './kernel';
```

Remover `type AssetResolver` do import (linha ~23).

Remover `private readonly companyRagSync: CompanyRagSyncService` e `private readonly contextPackService: ContextPackService` do constructor.

Remover o método `buildAssetResolver()` inteiro.

No método `startInlineExecution`, substituir o objeto `deps`:

```typescript
const deps: ExecutionDependencies = {
  prisma: this.prisma,
  contextPackBuilder: null,
  llmProvider: stubMode ? null : createTriggerLlmProvider(this.prisma),
  imageProvider: null,
  assetResolver: null,
  eventPublisher: new InProcessEventPublisher(this.sseService),
  blocks: this.agentRunBlockService,
  stubMode,
};
```

No método `startRun`, remover o bloco `await this.companyRagSync.ensureSynced(...)` (linhas ~170-172). O fluxo fica:

```typescript
if (isPersonal) {
  await this.creditInterceptor.checkPersonalBalance(
    options.personalSpaceId as string,
    agent.estimatedCreditCost ?? 0.01,
  );
} else {
  await this.creditInterceptor.checkBalance(
    options.companyId as string,
    agent.estimatedCreditCost ?? 0.01,
  );
}
```

Remover `campaignId?: string` de `StartRunOptions`.

No `prisma.agentRun.create({ data: { ... } })`, remover a linha `campaignId: options.campaignId,`.

**Sub-task 4D: Limpar kernel types e trigger-providers**

- [ ] **Step 8: Limpar `apps/api/src/agents/runtime/kernel/types.ts`**

Remover as interfaces `ContextChunk`, `ContextPack`, `BrandProfile` (linhas ~33-69).

Remover `type AssetResolver` (linha ~77).

Remover o campo `context?` de `AgentDefinition`.

Em `StepExecutionContext`, remover os campos `campaignId`, `contextPack`, `brandProfile`:

```typescript
export interface StepExecutionContext {
  runId: string;
  agentId: string;
  companyId: string;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
  previousStepsOutput: Record<string, Record<string, unknown>>;
}
```

- [ ] **Step 9: Limpar `trigger-providers.ts`**

Remover a função `createTriggerAssetResolver` (linhas ~154-190) inteira.

Remover a função `createTriggerImageProvider` (linhas ~192-231) inteira.

Remover imports do S3 que só eram usados por `createTriggerAssetResolver`:
```typescript
// remover
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
```

Remover import de `GeminiAdapter` se só era usado por `createTriggerImageProvider`:
```typescript
// remover
import { GeminiAdapter } from '../../../ai-runtime/adapters/gemini.adapter';
```

Remover `type AssetResolver` do import e o import de `ImageProvider` se não houver mais referência.

Atualizar o export de `kernel/index.ts` (se existir) para não re-exportar os providers removidos.

- [ ] **Step 10: Atualizar `cuts.prompts.ts`**

Remover as linhas que referenciam `brandProfile`:

```typescript
// remover estas linhas
const voice = context.brandProfile?.brandVoice
  ? `Workspace voice: ${context.brandProfile.brandVoice}.`
  : '';
```

e remover `voice,` do array do `buildCutsSystemPrompt`.

O prompt final:

```typescript
return [
  'You are a short-form video editor who turns long recordings into high-retention clips.',
  `Return up to ${settings.maxCuts} cuts, each around ${settings.cutDurationSec} seconds.`,
  'Required: strong title, description, startSec, endSec, viralScore from 0 to 100.',
  'Use ONLY timestamps that exist in the provided transcript segments — never invent times.',
  'Titles and descriptions must match the spoken language of the transcript.',
  'Order cuts from highest to lowest viralScore.',
]
  .filter(Boolean)
  .join(' ');
```

**Sub-task 4E: Limpar packages/agent-sdk**

- [ ] **Step 11: Simplificar `build-step-context.ts`**

Substituir o conteúdo completo do arquivo:

```typescript
import type { CreateStepContextParams } from '../core/agent-runtime-types';
import type { StepExecutionContext } from '../core/types';

export const buildStepContext = async (
  params: CreateStepContextParams,
): Promise<StepExecutionContext> => {
  return {
    runId: params.runId,
    agentId: params.agentId,
    companyId: params.companyId,
    stepKey: params.stepKey,
    stepIndex: params.stepIndex,
    inputPayload: params.inputPayload,
    previousStepsOutput: params.previousStepsOutput,
  };
};
```

- [ ] **Step 12: Limpar `packages/agent-sdk/src/core/types.ts`**

Remover as interfaces `ContextChunk`, `ContextPack`, `BrandProfile`, `AgentContextConfig` (linhas ~9-136).

Remover `type AssetResolver` (linha ~97).

Em `StepExecutionContext`, remover `campaignId`, `contextPack`, `brandProfile`:

```typescript
export interface StepExecutionContext {
  runId: string;
  agentId: string;
  companyId: string;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
  previousStepsOutput: Record<string, Record<string, unknown>>;
}
```

Em `BuiltAgentDefinition`, remover `context?: AgentContextConfig`.

- [ ] **Step 13: Limpar `packages/agent-sdk/src/core/agent-runtime-types.ts`**

Remover imports de `AssetResolver`, `AgentContextConfig`, `BrandProfile`, `ContextPack` do import de `./types`.

Remover a interface `ContextPackBuilder` (linhas ~95-105).

Em `CreateStepContextParams`, remover `campaignId`, `brandProfile`, `contextPackBuilder`, `contextConfig`:

```typescript
export interface CreateStepContextParams {
  runId: string;
  agentId: string;
  companyId: string;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
  previousStepsOutput: Record<string, Record<string, unknown>>;
}
```

Em `ExecutionKernelDeps`, remover `contextPackBuilder: ContextPackBuilder | null` e `assetResolver?: AssetResolver | null`.

- [ ] **Step 14: Limpar `packages/types/src/index.ts`**

Remover as linhas:
```typescript
export * from './rag/index';
export * from './brand-brain-progress';
export * from './brand-palette';
export * from './brand-visual';
```

- [ ] **Step 15: Limpar `packages/types/src/company.ts`**

Remover os imports dos arquivos brand deletados no topo:
```typescript
// remover
import { brandPaletteSchema } from './brand-palette';
import { brandAssetsSchema, logoVariantSchema, logoVariantsSchema } from './brand-visual';
```

Remover os schemas que dependem deles: `brandProfileResponseSchema`, `updateBrandProfileSchema`, `updateLogoSchema`, `addBrandAssetSchema` e os tipos correspondentes.

- [ ] **Step 16: Verificar compilação completa**

```bash
cd /path/to/monorepo

# SDK
cd packages/agent-sdk && npx tsc --noEmit 2>&1 | head -40

# Types
cd packages/types && npx tsc --noEmit 2>&1 | head -40

# API
cd apps/api && npx tsc --noEmit 2>&1 | head -40

# Web
cd apps/web && npx tsc --noEmit 2>&1 | head -40
```

Corrigir todos os erros antes de prosseguir. Erros mais comuns: imports que ainda referenciam interfaces removidas, ou arquivos que exportavam do `kernel/index.ts` funções agora deletadas.

Verificar `apps/api/src/agents/runtime/kernel/index.ts` e remover re-exports de `createTriggerAssetResolver`, `createTriggerImageProvider` se presentes.

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "feat: remove brand brain and all RAG usage — keep rag.module.ts dormant"
```

---

## Task 5: Rotas Mortas e Módulos Órfãos

**Files:** (ver mapa de arquivos — 10+ arquivos afetados)

**Interfaces:**
- Remove: `useAgentRunsMock`, `useAgentStatsMock`, `useCampaigns`, `useCaptionStyles`
- Mantém: `useCutsOverview`, `useCutsRuns`, `useCutsRunModalActions`

- [ ] **Step 1: Deletar rotas mortas e módulo history genérico**

```bash
rm apps/web/src/app/[locale]/dashboard/\(shell\)/campaigns/page.tsx
rm apps/web/src/app/[locale]/dashboard/\(shell\)/pieces/page.tsx
rm apps/web/src/app/[locale]/dashboard/\(shell\)/history/page.tsx
rm -rf apps/web/src/core/modules/history/
```

- [ ] **Step 2: Deletar hooks e utils fora de escopo**

```bash
rm apps/web/src/core/modules/agents/hooks/use-campaigns.ts
rm apps/web/src/core/modules/agents/hooks/use-caption-styles.ts
rm apps/web/src/core/modules/agents/hooks/use-agent-runs-mock.ts
rm apps/web/src/core/modules/dashboard/hooks/use-company-rag-status.ts
rm apps/web/src/core/modules/agents/utils/format-design-plan-preview.ts
```

- [ ] **Step 3: Simplificar `agent-overview-page.tsx` — remover branch mock não-cuts**

Substituir o conteúdo completo:

```typescript
"use client";

import { redirect } from "next/navigation";
import { useLocale } from "next-intl";
import { AgentEntitlementGate } from "src/core/modules/agents/components/agent-entitlement-gate";
import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { AgentOverviewStats } from "src/core/modules/agents/components/agent-overview-stats";
import { AgentUsageChart } from "src/core/modules/agents/components/agent-usage-chart";
import { useCutsOverview } from "src/core/modules/agents/hooks/use-cuts-overview";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { Heading } from "src/core/shared/components/ui/heading";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type AgentOverviewPageProps = {
  agentSlug: string;
};

export const AgentOverviewPage = ({ agentSlug }: AgentOverviewPageProps) => {
  const agent = getAgentByRouteSlug(agentSlug);
  const locale = useLocale();
  const overview = useCutsOverview(locale);

  if (!agent) {
    redirect("/dashboard");
  }

  return (
    <div data-testid="agent-overview-page" data-agent={agent.routeSlug}>
      <PageLayout
        icon={agent.icon}
        title={agent.name}
        description={agent.description}
        actions={<AgentNewRunButton routeSlug={agent.routeSlug} size="sm" />}
      >
        <AgentEntitlementGate agent={agent}>
          <div className="flex flex-col gap-6">
            <AgentOverviewStats
              totalRuns={overview.stats.totalRuns}
              completedRuns={overview.stats.completedRuns}
              approvedRuns={overview.stats.approvedRuns}
              creditsUsed={overview.stats.creditsUsed}
            />

            <AgentUsageChart data={overview.stats.usageByDay} />

            {overview.recentRuns.length > 0 ? (
              <div className="flex flex-col gap-4">
                <Heading level="h6" as="h2">Recentes</Heading>
                <ul className="flex flex-col gap-2">
                  {overview.recentRuns.map((run) => (
                    <li
                      key={run.id}
                      className="rounded-[var(--r-lg)] border border-[var(--line-default)] px-4 py-3"
                    >
                      <Paragraph className="font-medium">{run.title}</Paragraph>
                      {run.preview ? (
                        <Paragraph
                          size="p6"
                          tone="tertiary"
                          className="mt-1 line-clamp-1"
                        >
                          {run.preview}
                        </Paragraph>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </AgentEntitlementGate>
      </PageLayout>
    </div>
  );
};
```

- [ ] **Step 4: Atualizar `recent-activity.fixture.ts` — remover entradas não-cuts**

Substituir o array `RECENT_ACTIVITY_FIXTURE`:

```typescript
export type RecentActivityEntry = {
  id: string;
  text: string;
  when: string;
  agentId: string;
};

export const RECENT_ACTIVITY_FIXTURE: RecentActivityEntry[] = [
  {
    id: "a1",
    text: "Gerador de Cortes priorizou 8 cortes do Podcast #41",
    when: "há 2 horas",
    agentId: "cuts",
  },
  {
    id: "a2",
    text: "Gerador de Cortes finalizou 5 cortes do vídeo de apresentação",
    when: "ontem",
    agentId: "cuts",
  },
];
```

- [ ] **Step 5: Atualizar `agent-runs.fixture.ts` — remover runs não-cuts**

Abrir o arquivo e deletar todos os objetos do array onde `agentId !== "cuts"`. Manter apenas os runs com `agentId: "cuts"`.

- [ ] **Step 6: Remover `editorStyleId` do store**

Em `apps/web/src/core/modules/blister-os/stores/blister-os-store.ts`, remover:
- O campo `editorStyleId: string | null` da interface do state
- A propriedade `editorStyleId: "es-corte-seco"` do objeto de estado inicial
- O método `setEditorStyleId: (styleId) => set({ editorStyleId: styleId })` do objeto de actions

- [ ] **Step 7: Verificar compilação**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -40
```

Corrigir imports em arquivos que ainda referenciam os hooks/utils deletados.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: remove dead routes, orphan modules, and non-cuts fixtures"
```

---

## Task 6: Limpeza de Tipos e Backend Residual

**Files:**
- Modify: `apps/api/src/ai-catalog/ai-catalog.controller.ts`
- Modify: `apps/api/src/ai-catalog/platform-settings.service.ts` (verificar se existe `updateRagSettings`)
- Modify: `packages/types/src/agents.ts`
- Modify: `packages/types/src/ai-catalog.ts`

**Interfaces:**
- Remove: `updateRagSettingsSchema`, `ragPlatformSettingsSchema`, `UpdateRagSettingsDto`, `RagPlatformSettings`
- Remove de `runAgentRequestSchema`: campo `campaignId`
- Remove de `stepContextSchema`: campos `campaignId`, `brandProfile`, `contextPack`

- [ ] **Step 1: Remover endpoint RAG de `ai-catalog.controller.ts`**

Localizar o método `updateRagSettings` (~linha 186-193) e removê-lo inteiro:

```typescript
// remover este bloco inteiro
@Patch('settings/rag')
updateRagSettings(@Req() req: Request, @Body() body: unknown) {
  const user = req.currentUser;
  const parsed = updateRagSettingsSchema.safeParse(body);
  ...
  return this.settings.updateRagSettings(user.id, parsed.data);
}
```

Remover o import de `updateRagSettingsSchema` no topo do arquivo.

- [ ] **Step 2: Remover `updateRagSettings` do `platform-settings.service.ts`**

Abrir `apps/api/src/ai-catalog/platform-settings.service.ts` e remover o método `updateRagSettings` e quaisquer imports/referências a schemas RAG.

- [ ] **Step 3: Limpar `packages/types/src/agents.ts`**

Localizar `runAgentRequestSchema` e remover o campo `campaignId: z.string().min(1).optional()`.

Localizar `stepContextSchema` e remover os campos:
- `campaignId: z.string().nullable()`
- `contextPack: z.any().nullable()`
- `brandProfile: z.any().nullable()`

- [ ] **Step 4: Limpar `packages/types/src/ai-catalog.ts`**

Remover os schemas RAG:
- `ragPlatformSettingsSchema` e `RagPlatformSettings`
- `updateRagSettingsSchema` e `UpdateRagSettingsDto`

- [ ] **Step 5: Verificar compilação final**

```bash
cd packages/types && npx tsc --noEmit 2>&1 | head -30
cd apps/api && npx tsc --noEmit 2>&1 | head -30
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Corrigir qualquer import remanescente de `updateRagSettingsSchema`, `ragPlatformSettingsSchema`, `campaignId` em schemas de request.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat: remove rag platform settings endpoint and clean residual brand/campaign types"
```

---

## Self-Review

### Cobertura do spec

| Requisito do spec | Task que implementa |
|---|---|
| Fix login mobile — `router.refresh()` | Task 1 ✅ |
| Fix freeze modal — remove lazy mount | Task 2 ✅ |
| Fix freeze modal — preload="metadata" | Task 2 ✅ |
| Remover research, video_editor, brief generations | Task 3 ✅ |
| Remover `agent-ui-config.ts` | Task 3 ✅ |
| Limpar `STUDIO_ICONS` | Task 3 ✅ |
| Remover `dashboard-agents.ts` | Task 3 ✅ |
| Remover brand module frontend | Task 4 ✅ |
| Remover brand-memory-panel | Task 4 ✅ |
| Remover rota `/dashboard/brand` | Task 4 ✅ |
| Remover company-rag-sync, context-pack, rag-events, rag-admin | Task 4 ✅ |
| Remover adapters context-pack-builder | Task 4 ✅ |
| Remover company/brand/ backend | Task 4 ✅ |
| Remover rag-company.controller | Task 4 ✅ |
| Limpar company.module, agents.module, app.module | Task 4 ✅ |
| Limpar WorkflowEngineService | Task 4 ✅ |
| Remover createTriggerImageProvider, createTriggerAssetResolver | Task 4 ✅ |
| Limpar StepExecutionContext (contextPack, brandProfile, campaignId) | Task 4 ✅ |
| Simplificar buildStepContext | Task 4 ✅ |
| Limpar agent-sdk types | Task 4 ✅ |
| Deletar brand-brain-progress, brand-visual, brand-palette packages | Task 4 ✅ |
| Remover rotas mortas (campaigns, pieces, history) | Task 5 ✅ |
| Remover history module | Task 5 ✅ |
| Remover hooks fora de escopo | Task 5 ✅ |
| Simplificar agent-overview-page | Task 5 ✅ |
| Limpar fixtures | Task 5 ✅ |
| Remover editorStyleId do store | Task 5 ✅ |
| Remover PATCH /platform/settings/rag | Task 6 ✅ |
| Limpar schemas agents.ts | Task 6 ✅ |
| Limpar schemas ai-catalog.ts | Task 6 ✅ |

### Notas de risco

- **Task 4 é a mais complexa.** O TypeScript guiará os erros em cascata. Siga a ordem dos sub-steps: delete → limpe modules → limpe WorkflowEngine → limpe kernel → limpe SDK. Não tente compilar no meio da remoção de um sub-step.
- **`packages/types/src/company.ts`**: após remover `brand-palette` e `brand-visual`, verificar se `onboardingSchema` ou outros schemas de onboarding ainda referenciam campos de brand. Se sim, remover esses campos também (eles viraram campos opcionais no onboarding e podem permanecer como `z.string().optional()` sem o schema de brand).
- **`rag.module.ts` permanece**: não deletar `apps/api/src/rag/rag.module.ts` nem os serviços de retrieval/embedding/ingestion/document/caption restantes. Apenas a camada de brand brain (sync, events, serializer, context-pack) é removida.
- **`cuts-settings-form.tsx` e hooks de cuts** (`use-cuts-settings.ts`, `use-cuts-runs.ts`, etc.) devem permanecer intocados.
