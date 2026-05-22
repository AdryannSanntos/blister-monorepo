# Agents Context and Execution Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o nucleo de contexto e execucao dos agentes com chat conversacional, execucao operacional rastreavel, fila FIFO, retry e seguranca por permissao.

**Architecture:** O backend usa orquestracao em camadas: classificador de intencao, retrieval estruturado permission-aware, retrieval vetorial com pgvector, rerank e motor de execucao de workflow. Conversas e execucoes sao entidades separadas, com ligacao explicita entre mensagem e run para auditoria e replay.

**Tech Stack:** NestJS 11, Prisma, PostgreSQL + pgvector, Trigger.dev, CASL (`packages/authz`), Zod, storage S3-compatible.

---

## File Structure

### Backend files to create

- `apps/api/src/agents/agent-chat.controller.ts` - endpoints de conversa por agente.
- `apps/api/src/agents/company-chat.controller.ts` - endpoints do chat geral da empresa.
- `apps/api/src/agents/agent-chat.service.ts` - regras de thread, mensagem, branch, regenerate.
- `apps/api/src/agents/company-chat.service.ts` - agente de contexto interno e delegacao.
- `apps/api/src/agents/agent-intent.service.ts` - classificador conversa vs execucao.
- `apps/api/src/agents/agent-queue.service.ts` - controle de concorrencia e fila FIFO por empresa.
- `apps/api/src/agents/context/structured-context.service.ts` - consulta estruturada dos dominios da empresa.
- `apps/api/src/agents/context/rag-context.service.ts` - busca vetorial pgvector.
- `apps/api/src/agents/context/context-reranker.service.ts` - unificacao e rerank de contexto.
- `apps/api/src/agents/context/context-policy.service.ts` - filtros de permissao e bloqueio de segredos.
- `apps/api/src/agents/html-preview.service.ts` - preview e validacao de HTML antes de exportar PNG.
- `apps/api/src/notifications/agent-notifications.service.ts` - notificacoes in-app para eventos de execucao.
- `apps/api/src/agents/dto/chat-thread.dto.ts` - schemas de threads.
- `apps/api/src/agents/dto/chat-message.dto.ts` - schemas de mensagens, branch e regenerate.

### Backend files to modify

- `apps/api/prisma/schema.prisma` - modelos de chat, branch, referencias de output e metadados de tentativa.
- `apps/api/src/agents/agents.module.ts` - registrar novos services/controllers.
- `apps/api/src/agents/agent-execution.service.ts` - retry, tentativas na mesma run, timeline detalhada.
- `apps/api/src/agents/agent-runs.service.ts` - posicao em fila, metadados de processamento.
- `apps/api/src/agents/dto/agent-version.dto.ts` - novos blocos V1 (`question_form`, `html_validation`).
- `apps/api/src/agents/dto/index.ts` - exportacao dos novos DTOs.

### Backend tests

- `apps/api/src/agents/agent-chat.service.spec.ts`
- `apps/api/src/agents/company-chat.service.spec.ts`
- `apps/api/src/agents/agent-intent.service.spec.ts`
- `apps/api/src/agents/agent-queue.service.spec.ts`
- `apps/api/src/agents/context/context-policy.service.spec.ts`
- `apps/api/src/agents/html-preview.service.spec.ts`

---

### Task 1: Modelar chat, branch e relacao com execucoes

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/agents/dto/chat-thread.dto.ts`
- Create: `apps/api/src/agents/dto/chat-message.dto.ts`
- Modify: `apps/api/src/agents/dto/index.ts`
- Test: `apps/api/src/agents/agent-chat.service.spec.ts`

- [ ] **Step 1: Escrever teste de branch por edicao**

```ts
it('creates a new branch when editing an old message', async () => {
  const result = await service.editMessageAndBranch({ threadId, messageId, content: 'novo texto' }, userId);
  expect(result.branchId).toBeDefined();
  expect(result.replacedMessageId).toEqual(messageId);
});
```

- [ ] **Step 2: Rodar teste para falhar antes da implementacao**

Run: `pnpm --filter @company-os/api test agent-chat -- --runInBand`
Expected: FAIL com metodo nao implementado.

- [ ] **Step 3: Adicionar modelos Prisma de chat**

```prisma
model AgentChatThread {
  id              String   @id @default(cuid())
  organizationId  String
  agentId         String?
  scope           String
  createdByUserId String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 4: Implementar DTOs Zod sem userId no body**

```ts
export const createThreadSchema = z.object({
  scope: z.enum(['company_chat', 'agent_chat']),
  agentId: z.string().min(1).optional(),
  title: z.string().min(1).max(160).optional(),
});
```

- [ ] **Step 5: Rodar teste novamente**

Run: `pnpm --filter @company-os/api test agent-chat -- --runInBand`
Expected: PASS nos casos de branch/DTO.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/agents/dto/chat-thread.dto.ts apps/api/src/agents/dto/chat-message.dto.ts apps/api/src/agents/dto/index.ts apps/api/src/agents/agent-chat.service.spec.ts
git commit -m "feat(api): add chat thread and branch contracts"
```

### Task 2: Implementar classificador de intencao e regra de execucao automatica

**Files:**
- Create: `apps/api/src/agents/agent-intent.service.ts`
- Modify: `apps/api/src/agents/agent-chat.service.ts`
- Test: `apps/api/src/agents/agent-intent.service.spec.ts`

- [ ] **Step 1: Escrever testes para regra obrigatoria de artefato final**

```ts
it('forces execution for final artifact requests', async () => {
  const decision = await service.classify({ message: 'gere um pdf final com isso' });
  expect(decision.mode).toBe('execution');
});
```

- [ ] **Step 2: Rodar teste para falhar**

Run: `pnpm --filter @company-os/api test agent-intent`
Expected: FAIL por retorno incorreto/nao implementado.

- [ ] **Step 3: Implementar classificador com saida auditavel**

```ts
return {
  mode: isFinalArtifact ? 'execution' : 'conversational',
  reason: isFinalArtifact
    ? 'final_artifact_requested'
    : 'conversation_only',
};
```

- [ ] **Step 4: Integrar decisao ao fluxo de mensagem**

```ts
if (decision.mode === 'execution') {
  return this.runOrchestrator.startExecutionFromMessage(context);
}
```

- [ ] **Step 5: Rodar teste e lint do modulo**

Run: `pnpm --filter @company-os/api test agent-intent && pnpm --filter @company-os/api lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/agent-intent.service.ts apps/api/src/agents/agent-chat.service.ts apps/api/src/agents/agent-intent.service.spec.ts
git commit -m "feat(api): add intent classification for chat vs execution"
```

### Task 3: Retrieval em camadas com contexto completo e seguranca

**Files:**
- Create: `apps/api/src/agents/context/structured-context.service.ts`
- Create: `apps/api/src/agents/context/rag-context.service.ts`
- Create: `apps/api/src/agents/context/context-reranker.service.ts`
- Create: `apps/api/src/agents/context/context-policy.service.ts`
- Test: `apps/api/src/agents/context/context-policy.service.spec.ts`

- [ ] **Step 1: Escrever testes de bloqueio de segredos e filtro por permissao**

```ts
it('removes credentials and tokens from retrieval context', async () => {
  const safe = service.sanitizeContext(raw);
  expect(JSON.stringify(safe)).not.toContain('apiKey');
});
```

- [ ] **Step 2: Implementar retrieval estruturado por dominio**

```ts
const [brain, assets, runs, members] = await Promise.all([
  this.loadBrain(orgId),
  this.loadAssets(orgId),
  this.loadRuns(orgId),
  this.loadMembers(orgId),
]);
```

- [ ] **Step 3: Implementar retrieval vetorial pgvector**

```ts
const docs = await this.prisma.$queryRaw<RetrievedDoc[]>`
  SELECT id, content, metadata
  FROM "ContextEmbedding"
  WHERE "organizationId" = ${orgId}
  ORDER BY embedding <=> ${queryEmbedding}
  LIMIT ${k};
`;
```

- [ ] **Step 4: Implementar rerank final e lista de fontes amigaveis**

```ts
return reranked.map((item) => ({
  sourceLabel: item.sourceLabel,
  snippet: item.snippet,
  score: item.score,
}));
```

- [ ] **Step 5: Rodar testes**

Run: `pnpm --filter @company-os/api test context-policy`
Expected: PASS com bloqueio de segredos.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/context apps/api/src/agents/context/context-policy.service.spec.ts
git commit -m "feat(api): add layered retrieval with permission-aware sanitization"
```

### Task 4: Fila FIFO, limite de concorrencia e retry por tentativa

**Files:**
- Create: `apps/api/src/agents/agent-queue.service.ts`
- Modify: `apps/api/src/agents/agent-runs.service.ts`
- Modify: `apps/api/src/agents/agent-execution.service.ts`
- Test: `apps/api/src/agents/agent-queue.service.spec.ts`

- [ ] **Step 1: Escrever teste de limite 3 simultaneas por empresa**

```ts
it('queues run when organization has 3 running executions', async () => {
  const run = await service.enqueue({ organizationId, agentId, userId });
  expect(run.status).toBe('queued');
});
```

- [ ] **Step 2: Implementar fila FIFO por empresa**

```ts
const queuePosition = await this.computeQueuePosition(organizationId);
return this.prisma.agentRun.create({ data: { status: 'queued', queuePosition, ...payload } });
```

- [ ] **Step 3: Implementar retry automatico (1 tentativa)**

```ts
if (attemptNumber === 1) {
  await this.retryRun(runId, 2);
} else {
  await this.markRunAsError(runId, reason);
}
```

- [ ] **Step 4: Persistir tentativas na mesma run timeline**

```ts
await this.prisma.agentRunStep.create({
  data: { runId, blockType: 'attempt', status: 'error', metadata: { attemptNumber } },
});
```

- [ ] **Step 5: Rodar testes de queue e runs**

Run: `pnpm --filter @company-os/api test agent-queue && pnpm --filter @company-os/api test agent-runs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/agent-queue.service.ts apps/api/src/agents/agent-runs.service.ts apps/api/src/agents/agent-execution.service.ts apps/api/src/agents/agent-queue.service.spec.ts
git commit -m "feat(api): add fifo queue, concurrency cap and retry attempts"
```

### Task 5: Bloco de pergunta obrigatorio e validacao HTML->PNG

**Files:**
- Modify: `apps/api/src/agents/dto/agent-version.dto.ts`
- Modify: `apps/api/src/agents/agent-execution.service.ts`
- Create: `apps/api/src/agents/html-preview.service.ts`
- Test: `apps/api/src/agents/html-preview.service.spec.ts`

- [ ] **Step 1: Escrever teste do bloco question_form com otherResponse obrigatorio**

```ts
it('requires otherResponse option in question_form block', () => {
  expect(() => validateBlock(questionBlock)).not.toThrow();
});
```

- [ ] **Step 2: Implementar contrato do bloco**

```ts
const questionFormBlockSchema = z.object({
  type: z.literal('question_form'),
  fields: z.array(formFieldSchema),
  includeOtherResponse: z.literal(true),
});
```

- [ ] **Step 3: Escrever teste de validacao pre-exportacao HTML**

```ts
it('waits for user confirmation before html to png export', async () => {
  const state = await service.prepareHtmlValidation(runId, html);
  expect(state.status).toBe('awaiting_user_validation');
});
```

- [ ] **Step 4: Implementar preview + confirmacao + export + persistencia**

```ts
await this.storageService.uploadObject({ key, body: pngBuffer, contentType: 'image/png' });
await this.prisma.agentRun.update({ data: { outputPayload: { files: [{ key }] } } });
```

- [ ] **Step 5: Rodar testes**

Run: `pnpm --filter @company-os/api test html-preview`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/dto/agent-version.dto.ts apps/api/src/agents/agent-execution.service.ts apps/api/src/agents/html-preview.service.ts apps/api/src/agents/html-preview.service.spec.ts
git commit -m "feat(api): add question form and html pre-export validation"
```

### Task 6: Chat geral com agente de contexto e delegacao

**Files:**
- Create: `apps/api/src/agents/company-chat.controller.ts`
- Create: `apps/api/src/agents/company-chat.service.ts`
- Modify: `apps/api/src/agents/agents.module.ts`
- Test: `apps/api/src/agents/company-chat.service.spec.ts`

- [ ] **Step 1: Escrever testes de fallback sem agentes customizados**

```ts
it('executes with internal context agent and returns create-agent card when no custom agent exists', async () => {
  const result = await service.handleMessage(orgId, userId, 'gere um pdf final');
  expect(result.fallbackMode).toBe('context_agent');
  expect(result.cards[0].type).toBe('create_agent');
});
```

- [ ] **Step 2: Implementar fluxo de delegacao explicita**

```ts
return {
  delegatedToAgentId,
  delegatedExecutionId,
  responseTarget: 'company_chat',
};
```

- [ ] **Step 3: Adicionar guards e ownership**

```ts
@Post('organizations/:orgId/company-chat/threads/:threadId/messages')
@RequirePermission('agent.execute')
```

- [ ] **Step 4: Rodar testes do modulo**

Run: `pnpm --filter @company-os/api test company-chat`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/company-chat.controller.ts apps/api/src/agents/company-chat.service.ts apps/api/src/agents/agents.module.ts apps/api/src/agents/company-chat.service.spec.ts
git commit -m "feat(api): add company chat context agent and delegation flow"
```

---

## Final Verification

- [ ] Run: `pnpm --filter @company-os/api prisma generate`
- [ ] Run: `pnpm --filter @company-os/api test`
- [ ] Run: `pnpm --filter @company-os/api lint`
- [ ] Run: `pnpm --filter @company-os/authz build`

Expected: tudo PASS, sem endpoints de mutacao sem `@RequirePermission`, sem `userId` vindo do body.
