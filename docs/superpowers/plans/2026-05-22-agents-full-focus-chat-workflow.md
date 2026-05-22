# Agents Full-Focus Chat and Workflow UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a experiencia de agentes no frontend com layout full-focus, tela unica por agente, chat no padrao ChatGPT e editor de workflow por agente.

**Architecture:** O frontend separa os fluxos de dashboard operacional e full-focus. Chat geral e workspace do agente usam um layout shared dedicado, com sidebars proprias, bloqueios de input por execucao e exibicao interativa de timeline e outputs.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query, TanStack Table, nuqs, shadcn/ui, Tailwind v4 tokens.

---

## File Structure

### Frontend files to create

- `apps/web/src/core/shared/layouts/full-focus-layout.tsx` - layout base full-focus reutilizavel.
- `apps/web/src/core/shared/layouts/full-focus-shell.tsx` - shell com sidebar e area principal.
- `apps/web/src/core/modules/company-chat/pages/company-chat-page.tsx` - tela full-focus do chat geral.
- `apps/web/src/core/modules/company-chat/components/company-chat-sidebar.tsx` - conversas, atividade, atalhos.
- `apps/web/src/core/modules/company-chat/hooks/use-company-chat.ts` - queries/mutations do chat geral.
- `apps/web/src/core/modules/agents/pages/agent-workspace-page.tsx` - tela unica por agente.
- `apps/web/src/core/modules/agents/components/agent-workspace-sidebar.tsx` - nav interna Chat/Workflow/Execucoes/Configuracoes.
- `apps/web/src/core/modules/agents/components/chat/question-form-message.tsx` - formulario inline com other response.
- `apps/web/src/core/modules/agents/components/chat/chat-branch-switcher.tsx` - troca de branch apos edicao.
- `apps/web/src/core/modules/agents/components/output/output-tabs.tsx` - abas de arquivos/outputs.
- `apps/web/src/core/modules/agents/components/output/html-preview-editor.tsx` - preview/edicao de HTML pre-export.
- `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts` - hooks de conversa por agente.

### Frontend files to modify

- `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`
- `apps/web/src/core/modules/agents/components/agent-output-preview.tsx`
- `apps/web/src/core/modules/agents/components/agent-run-detail-sheet.tsx`
- `apps/web/src/core/modules/agents/components/agent-run-table.tsx`
- `apps/web/src/core/modules/agents/hooks/use-agents.ts`
- `apps/web/src/core/modules/agents/hooks/use-agent-runs.ts`
- `apps/web/src/app/dashboard/workspace/agents/[agentId]/page.tsx` (criar caso nao exista)
- `apps/web/src/app/dashboard/workspace/chat/page.tsx`

---

### Task 1: Criar layout shared full-focus

**Files:**
- Create: `apps/web/src/core/shared/layouts/full-focus-layout.tsx`
- Create: `apps/web/src/core/shared/layouts/full-focus-shell.tsx`
- Test: `apps/web/src/core/shared/layouts/full-focus-layout.test.tsx`

- [ ] **Step 1: Escrever teste de renderizacao com sidebar e content**

```tsx
it('renders full-focus shell with sidebar and main area', () => {
  render(<FullFocusLayout sidebar={<div>nav</div>}><div>content</div></FullFocusLayout>);
  expect(screen.getByText('nav')).toBeInTheDocument();
  expect(screen.getByText('content')).toBeInTheDocument();
});
```

- [ ] **Step 2: Implementar layout base reutilizavel**

```tsx
export function FullFocusLayout({ sidebar, children }: Props) {
  return <div className="flex h-svh"><aside className="w-72">{sidebar}</aside><main className="flex-1">{children}</main></div>;
}
```

- [ ] **Step 3: Rodar testes**

Run: `pnpm --filter @company-os/web test full-focus-layout`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/core/shared/layouts/full-focus-layout.tsx apps/web/src/core/shared/layouts/full-focus-shell.tsx apps/web/src/core/shared/layouts/full-focus-layout.test.tsx
git commit -m "feat(web): add shared full-focus layout shell"
```

### Task 2: Sidebar principal com collapsible de agentes customizados

**Files:**
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`
- Create: `apps/web/src/core/modules/agents/components/agents-sidebar-collapsible.tsx`
- Modify: `apps/web/src/core/modules/agents/hooks/use-agents.ts`

- [ ] **Step 1: Escrever teste de render da lista de agentes no collapsible**

```tsx
it('lists custom agents inside dashboard sidebar collapsible', () => {
  render(<AgentsSidebarCollapsible agents={[{ id: 'a1', name: 'Vendas GPT', slug: 'vendas-gpt', status: 'active' }]} />);
  expect(screen.getByText('Vendas GPT')).toBeInTheDocument();
});
```

- [ ] **Step 2: Implementar componente com navegacao para tela unica**

```tsx
<Link href={`/dashboard/workspace/agents/${agent.id}/chat`}>{agent.name}</Link>
```

- [ ] **Step 3: Exibir indicador de execucao em andamento**

```tsx
{agent.hasRunningExecution ? <Badge variant="warning">Executando</Badge> : null}
```

- [ ] **Step 4: Rodar lint**

Run: `pnpm --filter @company-os/web lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx apps/web/src/core/modules/agents/components/agents-sidebar-collapsible.tsx apps/web/src/core/modules/agents/hooks/use-agents.ts
git commit -m "feat(web): add custom agents collapsible in dashboard sidebar"
```

### Task 3: Entregar tela full-focus do chat geral

**Files:**
- Create: `apps/web/src/core/modules/company-chat/pages/company-chat-page.tsx`
- Create: `apps/web/src/core/modules/company-chat/components/company-chat-sidebar.tsx`
- Create: `apps/web/src/core/modules/company-chat/hooks/use-company-chat.ts`
- Create: `apps/web/src/app/dashboard/workspace/chat/page.tsx`

- [ ] **Step 1: Implementar sidebar do chat geral com 3 blocos**

```tsx
<CompanyChatSidebar sections={['conversations', 'running_activity', 'agent_shortcuts']} />
```

- [ ] **Step 2: Implementar bloqueio de input durante execucao ativa da conversa**

```tsx
<ChatInput disabled={thread.hasRunningExecution} />
```

- [ ] **Step 3: Implementar clique em atividade abrindo conversa de origem**

```tsx
onSelectRunningItem={(item) => void setThreadId(item.sourceThreadId)}
```

- [ ] **Step 4: Rodar lint e smoke test da rota**

Run: `pnpm --filter @company-os/web lint`
Expected: PASS sem erro de rota.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/company-chat apps/web/src/app/dashboard/workspace/chat/page.tsx
git commit -m "feat(web): add full-focus company chat page and sidebar"
```

### Task 4: Entregar tela unica do agente com nave interna

**Files:**
- Create: `apps/web/src/core/modules/agents/pages/agent-workspace-page.tsx`
- Create: `apps/web/src/core/modules/agents/components/agent-workspace-sidebar.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/[agentId]/chat/page.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/[agentId]/workflow/page.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/[agentId]/executions/page.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/[agentId]/settings/page.tsx`

- [ ] **Step 1: Criar estrutura da sidebar interna com 4 secoes**

```tsx
const items = [
  { key: 'chat', href: `/dashboard/workspace/agents/${agentId}/chat` },
  { key: 'workflow', href: `/dashboard/workspace/agents/${agentId}/workflow` },
  { key: 'executions', href: `/dashboard/workspace/agents/${agentId}/executions` },
  { key: 'settings', href: `/dashboard/workspace/agents/${agentId}/settings` },
];
```

- [ ] **Step 2: Definir rota default abrindo Chat**

```tsx
redirect(`/dashboard/workspace/agents/${params.agentId}/chat`);
```

- [ ] **Step 3: Proteger secoes sensiveis com PermissionGate**

```tsx
<PermissionGate permission="agent.update">...</PermissionGate>
```

- [ ] **Step 4: Rodar lint**

Run: `pnpm --filter @company-os/web lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/agents/pages/agent-workspace-page.tsx apps/web/src/core/modules/agents/components/agent-workspace-sidebar.tsx apps/web/src/app/dashboard/workspace/agents/[agentId]
git commit -m "feat(web): add full-focus single workspace per agent"
```

### Task 5: Chat estilo ChatGPT com edit, branch, regenerate e copy

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`
- Create: `apps/web/src/core/modules/agents/components/chat/chat-branch-switcher.tsx`
- Modify: `apps/web/src/core/modules/agents/pages/agent-detail-page.tsx` (migrar para workspace chat)

- [ ] **Step 1: Adicionar hooks de thread/message/branch**

```ts
export function useEditMessageAndBranch(orgId: string, agentId: string, threadId: string) {
  return useMutation({ mutationFn: (payload) => apiClient.post(`/organizations/${orgId}/agents/${agentId}/threads/${threadId}/branch`, payload) });
}
```

- [ ] **Step 2: Expor acao de regenerate por mensagem**

```tsx
<DropdownMenuItem onClick={() => regenerateMessage.mutate({ messageId })}>Regenerar</DropdownMenuItem>
```

- [ ] **Step 3: Expor acao de copiar mensagem**

```tsx
<DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>Copiar</DropdownMenuItem>
```

- [ ] **Step 4: Mostrar provider/model por resposta**

```tsx
<Badge variant="secondary">{message.provider} / {message.model}</Badge>
```

- [ ] **Step 5: Rodar lint**

Run: `pnpm --filter @company-os/web lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-agent-chat.ts apps/web/src/core/modules/agents/components/chat/chat-branch-switcher.tsx apps/web/src/core/modules/agents/pages/agent-detail-page.tsx
git commit -m "feat(web): add chat branch editing regenerate and copy actions"
```

### Task 6: Timeline interativa + formulario inline + outputs em abas

**Files:**
- Create: `apps/web/src/core/modules/agents/components/chat/question-form-message.tsx`
- Modify: `apps/web/src/core/modules/agents/components/agent-run-detail-sheet.tsx`
- Modify: `apps/web/src/core/modules/agents/components/agent-output-preview.tsx`
- Create: `apps/web/src/core/modules/agents/components/output/output-tabs.tsx`
- Create: `apps/web/src/core/modules/agents/components/output/html-preview-editor.tsx`

- [ ] **Step 1: Implementar timeline recolhida no chat e aberta em execucoes**

```tsx
<ExecutionTimeline defaultExpanded={viewMode === 'executions'} events={events} />
```

- [ ] **Step 2: Implementar mensagem de formulario com tipos V1 e other response**

```tsx
{field.type === 'single_select' ? <Select ... /> : null}
<FormField name="otherResponse" render={...} />
```

- [ ] **Step 3: Implementar output tabs**

```tsx
<Tabs defaultValue="text">
  <TabsTrigger value="text">Texto</TabsTrigger>
  <TabsTrigger value="pdf">PDF</TabsTrigger>
  <TabsTrigger value="images">Imagens</TabsTrigger>
</Tabs>
```

- [ ] **Step 4: Implementar editor de preview HTML antes de export**

```tsx
<Textarea value={html} onChange={(e) => setHtml(e.target.value)} />
<Button onClick={revalidatePreview}>Revalidar</Button>
<Button onClick={confirmExport}>Confirmar e exportar</Button>
```

- [ ] **Step 5: Rodar lint**

Run: `pnpm --filter @company-os/web lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/agents/components/chat/question-form-message.tsx apps/web/src/core/modules/agents/components/agent-run-detail-sheet.tsx apps/web/src/core/modules/agents/components/agent-output-preview.tsx apps/web/src/core/modules/agents/components/output
git commit -m "feat(web): add execution timeline form messages and output tabs"
```

### Task 7: Configuracoes do agente com limites de execucao

**Files:**
- Modify: `apps/web/src/app/dashboard/workspace/agents/[agentId]/settings/page.tsx`
- Create: `apps/web/src/core/modules/agents/components/settings/agent-limits-form.tsx`
- Modify: `apps/web/src/core/modules/agents/hooks/use-agents.ts`

- [ ] **Step 1: Implementar formulario com campos V1**

```ts
const schema = z.object({
  name: z.string().min(2),
  description: z.string().max(500).optional(),
  timeoutMs: z.number().int().min(1000),
  maxFilesPerExecution: z.number().int().min(1).max(10),
  maxInputBytes: z.number().int().min(1024),
});
```

- [ ] **Step 2: Proteger acao com PermissionGate**

```tsx
<PermissionGate permission="agent.update"><Button type="submit">Salvar</Button></PermissionGate>
```

- [ ] **Step 3: Rodar lint**

Run: `pnpm --filter @company-os/web lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/workspace/agents/[agentId]/settings/page.tsx apps/web/src/core/modules/agents/components/settings/agent-limits-form.tsx apps/web/src/core/modules/agents/hooks/use-agents.ts
git commit -m "feat(web): add agent settings with execution limits"
```

---

## Final Verification

- [ ] Run: `pnpm --filter @company-os/web lint`
- [ ] Run: `pnpm --filter @company-os/web test`
- [ ] Run: `pnpm --filter @company-os/web build`

Expected: rotas full-focus funcionando, sem regressao no shell dashboard, sem acao sensivel fora de `PermissionGate`.
