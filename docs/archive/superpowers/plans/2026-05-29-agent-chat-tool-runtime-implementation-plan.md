# Agent Chat Tool Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar tool calling conversacional no chat de agentes com `rag_search`, `file_search` e `web_research`, allowlist por agente, auditoria dedicada e renderizacao frontend padronizada com `agent-elements`.

**Architecture:** O backend passa a ter um `AgentToolRuntime` proprio do chat, separado de `AgentRun`, mas reutilizavel no futuro pelo workflow. O frontend continua conversation-first, persistindo `toolParts` no metadata da mensagem e renderizando com `agent-elements` como linguagem oficial de componentes de IA.

**Tech Stack:** NestJS 11, Prisma, Zod, Next.js 16, React 19, TanStack Query, `agent-elements`, `@xyflow/react`, Biome, Jest.

---

## Mandatory Reading and Skill Order

1. `CLAUDE.md`
2. `docs/skills/agents-skill.md`
3. `docs/superpowers/specs/2026-05-29-agent-chat-tool-runtime-design.md`
4. `apps/web/AGENTS.md`

### Mandatory skills during execution

- `company-os-backend`
- `company-os-authz`
- `company-os-design`
- `agent-elements`
- `verification-before-completion`

---

## File Structure

### Files to create

- `apps/api/src/agents/dto/agent-chat-tool.dto.ts`
- `apps/api/src/agents/agent-tool-runtime.service.ts`
- `apps/api/src/agents/agent-tool-policy.service.ts`
- `apps/api/src/agents/tools/rag-search.tool.ts`
- `apps/api/src/agents/tools/file-search.tool.ts`
- `apps/api/src/agents/tools/web-research.tool.ts`
- `apps/api/src/agents/agent-tool-runtime.service.spec.ts`
- `apps/api/src/agents/agent-tool-policy.service.spec.ts`
- `apps/web/src/core/modules/agents/components/chat/chat-tool-part-adapter.ts`
- `apps/web/src/core/modules/agents/components/chat/chat-tool-sections.ts`

### Files to modify

- `apps/api/prisma/schema.prisma`
- `apps/api/src/agents/dto/agent.dto.ts`
- `apps/api/src/agents/dto/index.ts`
- `apps/api/src/agents/agents.service.ts`
- `apps/api/src/agents/agents.controller.ts`
- `apps/api/src/agents/agents.module.ts`
- `apps/api/src/agents/agent-chat-orchestrator.service.ts`
- `apps/api/src/agents/agent-chat-orchestrator.service.spec.ts`
- `apps/api/src/agents/agent-chat.service.ts`
- `apps/api/src/agents/agent-chat.service.spec.ts`
- `apps/web/src/core/modules/agents/hooks/use-agents.ts`
- `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`
- `apps/web/src/core/modules/agents/pages/agent-settings-page.tsx`
- `apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx`
- `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`

---

## Task 1: Add Backend Data Model for Tool Allowlist and Chat Tool Audit

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/agents/dto/agent.dto.ts`
- Modify: `apps/api/src/agents/dto/index.ts`
- Modify: `apps/api/src/agents/agents.service.ts`
- Modify: `apps/api/src/agents/agents.controller.ts`
- Test: `apps/api/src/agents/agents.service.spec.ts`

- [ ] **Step 1: Add Prisma fields for allowlist and tool-call audit**

Update `CompanyAgent` and add `AgentChatToolCall` in `apps/api/prisma/schema.prisma`:

```prisma
model CompanyAgent {
  id            String   @id @default(cuid())
  organizationId String
  name          String
  slug          String
  status        String
  allowedTools  Json     @default("[]")
  // existing fields...
}

model AgentChatToolCall {
  id              String   @id @default(cuid())
  organizationId  String
  agentId         String
  threadId        String
  messageId       String
  toolName        String
  status          String
  inputPayload    Json
  outputPayload   Json?
  errorMessage    String?
  durationMs      Int?
  createdByUserId String?
  createdAt       DateTime @default(now())

  agent    CompanyAgent     @relation(fields: [agentId], references: [id])
  thread   AgentChatThread  @relation(fields: [threadId], references: [id])
  message  AgentChatMessage @relation(fields: [messageId], references: [id])

  @@index([organizationId, agentId, createdAt])
  @@index([threadId, createdAt])
  @@index([messageId])
}
```

- [ ] **Step 2: Extend agent DTOs with allowedTools schema**

Add a strict tool enum in `apps/api/src/agents/dto/agent.dto.ts`:

```ts
export const agentAllowedToolSchema = z.enum([
  'rag_search',
  'file_search',
  'web_research',
]);

export const allowedToolsSchema = z.array(agentAllowedToolSchema).max(16).default([]);
```

Then thread it into create/update schemas:

```ts
allowedTools: allowedToolsSchema.optional(),
```

- [ ] **Step 3: Persist allowedTools in agent create/update flows**

In `apps/api/src/agents/agents.service.ts`, store and read `allowedTools` consistently:

```ts
allowedTools: parsedData.allowedTools ?? [],
```

And normalize reads:

```ts
const allowedTools = Array.isArray(agent.allowedTools) ? agent.allowedTools : [];
```

- [ ] **Step 4: Keep controller validation strict and scoped**

No new endpoints are needed. Reuse existing create/update endpoints in `apps/api/src/agents/agents.controller.ts`.

The only code change needed there is to keep passing validated DTOs through unchanged:

```ts
return this.agentsService.updateCompanyAgent(orgId, agentId, currentUser.id, parsed.data);
```

- [ ] **Step 5: Add/adjust service tests for allowedTools**

Extend `apps/api/src/agents/agents.service.spec.ts` with cases like:

```ts
it('stores allowedTools on create', async () => {
  const result = await service.createCompanyAgent('org-1', 'user-1', {
    name: 'Research Agent',
    slug: 'research-agent',
    description: '...',
    allowedTools: ['rag_search', 'file_search'],
  });

  expect(result.allowedTools).toEqual(['rag_search', 'file_search']);
});
```

- [ ] **Step 6: Run focused verification**

Run: `pnpm test -- agents.service`
Expected: the updated service spec passes.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/api/prisma/schema.prisma apps/api/src/agents/dto/agent.dto.ts apps/api/src/agents/dto/index.ts apps/api/src/agents/agents.service.ts apps/api/src/agents/agents.controller.ts apps/api/src/agents/agents.service.spec.ts
git commit -m "feat: add agent tool allowlist model"
```

---

## Task 2: Introduce Shared Chat Tool Contracts and Policy Layer

**Files:**
- Create: `apps/api/src/agents/dto/agent-chat-tool.dto.ts`
- Create: `apps/api/src/agents/agent-tool-policy.service.ts`
- Create: `apps/api/src/agents/agent-tool-policy.service.spec.ts`
- Modify: `apps/api/src/agents/agents.module.ts`
- Test: `apps/api/src/agents/agent-tool-policy.service.spec.ts`

- [ ] **Step 1: Define the canonical tool contract DTOs**

Create `apps/api/src/agents/dto/agent-chat-tool.dto.ts`:

```ts
import { z } from 'zod';

export const agentChatToolNameSchema = z.enum([
  'rag_search',
  'file_search',
  'web_research',
]);

export const agentToolResultSchema = z.object({
  toolName: agentChatToolNameSchema,
  summary: z.string(),
  results: z.array(z.record(z.string(), z.unknown())),
  citations: z.array(
    z.object({
      label: z.string(),
      url: z.string().optional(),
      sourceType: z.string().optional(),
      sourceId: z.string().optional(),
    }),
  ),
  metadata: z.object({
    durationMs: z.number().int().nonnegative(),
    resultCount: z.number().int().nonnegative(),
    truncated: z.boolean().optional(),
  }),
});
```

- [ ] **Step 2: Export the new DTOs from the agents DTO index**

Modify `apps/api/src/agents/dto/index.ts`:

```ts
export * from './agent-chat-tool.dto';
```

- [ ] **Step 3: Implement the policy service**

Create `apps/api/src/agents/agent-tool-policy.service.ts`:

```ts
@Injectable()
export class AgentToolPolicyService {
  assertToolAllowed(agentAllowedTools: string[], toolName: string) {
    if (!agentAllowedTools.includes(toolName)) {
      throw new ForbiddenException('Tool is not enabled for this agent');
    }
  }

  getPermissionsForTool(toolName: string): string[] {
    switch (toolName) {
      case 'rag_search':
        return ['context.read', 'brain.read', 'asset.read'];
      case 'file_search':
        return ['context.read', 'asset.read'];
      case 'web_research':
        return [];
    }
  }
}
```

- [ ] **Step 4: Register the policy service in the agents module**

Modify `apps/api/src/agents/agents.module.ts` providers:

```ts
AgentToolPolicyService,
```

- [ ] **Step 5: Add policy unit tests**

Create `apps/api/src/agents/agent-tool-policy.service.spec.ts`:

```ts
it('rejects a tool that is not enabled for the agent', () => {
  expect(() => service.assertToolAllowed(['rag_search'], 'web_research')).toThrow();
});

it('returns read-only permissions for file_search', () => {
  expect(service.getPermissionsForTool('file_search')).toEqual(['context.read', 'asset.read']);
});
```

- [ ] **Step 6: Run focused verification**

Run: `pnpm test -- agent-tool-policy`
Expected: the new policy spec passes.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/agents/dto/agent-chat-tool.dto.ts apps/api/src/agents/dto/index.ts apps/api/src/agents/agent-tool-policy.service.ts apps/api/src/agents/agent-tool-policy.service.spec.ts apps/api/src/agents/agents.module.ts
git commit -m "feat: add chat tool contracts and policy"
```

---

## Task 3: Implement AgentToolRuntime and the Three Read-Only Tools

**Files:**
- Create: `apps/api/src/agents/agent-tool-runtime.service.ts`
- Create: `apps/api/src/agents/tools/rag-search.tool.ts`
- Create: `apps/api/src/agents/tools/file-search.tool.ts`
- Create: `apps/api/src/agents/tools/web-research.tool.ts`
- Create: `apps/api/src/agents/agent-tool-runtime.service.spec.ts`
- Modify: `apps/api/src/agents/agents.module.ts`
- Test: `apps/api/src/agents/agent-tool-runtime.service.spec.ts`

- [ ] **Step 1: Create the `rag_search` executor on top of the existing RAG layer**

Create `apps/api/src/agents/tools/rag-search.tool.ts` with an adapter like:

```ts
export async function runRagSearchTool(...) {
  const pack = await ragContextAssemblyService.assemble(organizationId, query, { limit, permissions });

  return {
    toolName: 'rag_search',
    summary: pack.chunks.length > 0 ? `Encontrados ${pack.chunks.length} trechos relevantes.` : 'Nenhum trecho relevante encontrado.',
    results: pack.chunks.map((chunk) => ({
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      title: chunk.title,
      snippet: chunk.snippet,
      score: chunk.score,
    })),
    citations: pack.chunks.map((chunk) => ({
      label: chunk.title ?? chunk.sourceType,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId ?? undefined,
    })),
    metadata: { durationMs, resultCount: pack.chunks.length },
  };
}
```

- [ ] **Step 2: Create the `file_search` executor as an aggregate over agent context + indexed docs**

Create `apps/api/src/agents/tools/file-search.tool.ts`:

```ts
export async function runFileSearchTool(...) {
  const agentContext = await agentContextService.resolveForRun(organizationId, agentId);
  const ragPack = await ragContextAssemblyService.assemble(organizationId, query, { limit, permissions });

  const contextFileResults = agentContext.files.map((file) => ({
    origin: 'agent_context_file',
    fileId: file.id,
    filename: file.filename,
    snippet: '',
    score: 0,
  }));

  const ragResults = ragPack.chunks.map((chunk) => ({
    origin: 'rag_document',
    documentId: chunk.documentId,
    title: chunk.title,
    snippet: chunk.snippet,
    score: chunk.score,
  }));

  const results = [...contextFileResults, ...ragResults].slice(0, limit);
  return {
    toolName: 'file_search',
    summary: results.length > 0 ? `Encontrados ${results.length} resultados em arquivos e documentos.` : 'Nenhum arquivo relevante encontrado.',
    results,
    citations: results.map((row) => ({
      label: row.filename ?? row.title ?? row.origin,
      sourceType: row.origin,
      sourceId: row.fileId ?? row.documentId,
    })),
    metadata: { durationMs, resultCount: results.length },
  };
}
```

- [ ] **Step 3: Create the `web_research` executor behind one adapter point**

Create `apps/api/src/agents/tools/web-research.tool.ts`:

```ts
export async function runWebResearchTool(...) {
  const results = await webResearchGateway.searchAndFetch({ query, limit });

  return {
    toolName: 'web_research',
    summary: results.length > 0 ? `Pesquisadas ${results.length} fontes externas.` : 'Nenhuma fonte externa relevante encontrada.',
    results,
    citations: results.map((row) => ({ label: row.title, url: row.url })),
    metadata: { durationMs, resultCount: results.length },
  };
}
```

If the gateway does not exist yet, define an injected interface and a temporary stub provider in the module so the integration point is explicit.

- [ ] **Step 4: Implement `AgentToolRuntime` as the shared execution layer**

Create `apps/api/src/agents/agent-tool-runtime.service.ts`:

```ts
@Injectable()
export class AgentToolRuntimeService {
  async run(input: {
    organizationId: string;
    agentId: string;
    userId: string;
    allowedTools: string[];
    toolName: 'rag_search' | 'file_search' | 'web_research';
    query: string;
    limit?: number;
    permissions: string[];
  }) {
    this.policy.assertToolAllowed(input.allowedTools, input.toolName);

    switch (input.toolName) {
      case 'rag_search':
        return runRagSearchTool(...);
      case 'file_search':
        return runFileSearchTool(...);
      case 'web_research':
        return runWebResearchTool(...);
    }
  }
}
```

- [ ] **Step 5: Register runtime and tool executors in the module**

Add providers/imports in `apps/api/src/agents/agents.module.ts` for the runtime and any executor dependencies.

- [ ] **Step 6: Add runtime specs**

Create `apps/api/src/agents/agent-tool-runtime.service.spec.ts` covering:

```ts
it('runs rag_search when enabled', async () => { ... });
it('rejects disabled tools', async () => { ... });
it('normalizes file_search output', async () => { ... });
```

- [ ] **Step 7: Run focused verification**

Run: `pnpm test -- agent-tool-runtime`
Expected: runtime spec passes.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/agents/agent-tool-runtime.service.ts apps/api/src/agents/tools/rag-search.tool.ts apps/api/src/agents/tools/file-search.tool.ts apps/api/src/agents/tools/web-research.tool.ts apps/api/src/agents/agent-tool-runtime.service.spec.ts apps/api/src/agents/agents.module.ts
git commit -m "feat: add conversational agent tool runtime"
```

---

## Task 4: Integrate Tool Loop into Agent Chat Orchestrator and Persist Audit + UI Metadata

**Files:**
- Modify: `apps/api/src/agents/agent-chat-orchestrator.service.ts`
- Modify: `apps/api/src/agents/agent-chat.service.ts`
- Modify: `apps/api/src/agents/agent-chat-orchestrator.service.spec.ts`
- Modify: `apps/api/src/agents/agent-chat.service.spec.ts`
- Test: `apps/api/src/agents/agent-chat-orchestrator.service.spec.ts`
- Test: `apps/api/src/agents/agent-chat.service.spec.ts`

- [ ] **Step 1: Extend the orchestrator decision contract to support tool calls**

In `apps/api/src/agents/agent-chat-orchestrator.service.ts`, introduce a structured turn shape like:

```ts
type ConversationalTurnDecision =
  | { action: 'respond'; assistantMessage: string; events: Array<{ type: string; label: string }> }
  | { action: 'tool_call'; toolName: 'rag_search' | 'file_search' | 'web_research'; query: string; limit?: number; rationale?: string };
```

- [ ] **Step 2: Add the internal tool loop to the orchestrator**

Implement a loop in `orchestrateMessage()`:

```ts
const toolParts: Array<Record<string, unknown>> = [];

for (let i = 0; i < 4; i += 1) {
  const decision = await this.decideNextTurnStep(...);
  if (decision.action === 'respond') {
    return { ...decision, toolParts };
  }

  const result = await this.agentToolRuntime.run(...);
  toolParts.push({
    type: 'tool-Search',
    toolCallId: `${messageId}:${i}`,
    state: 'output-available',
    input: { query: decision.query, toolName: decision.toolName },
    output: { results: result.results, summary: result.summary, citations: result.citations },
  });
  contextFrames.push(result);
}
```

- [ ] **Step 3: Persist `AgentChatToolCall` rows during each tool execution**

Write each tool call as an audit row from the orchestrator or runtime boundary:

```ts
await this.prisma.agentChatToolCall.create({
  data: {
    organizationId,
    agentId,
    threadId,
    messageId,
    toolName,
    status: 'completed',
    inputPayload: { query },
    outputPayload: result,
    durationMs: result.metadata.durationMs,
    createdByUserId: userId,
  },
});
```

- [ ] **Step 4: Persist assistant-message metadata with `toolParts`**

Modify `apps/api/src/agents/agent-chat.service.ts` assistant message creation:

```ts
const assistantMessage = await this.createChatMessage({
  threadId: thread.id,
  role: 'assistant',
  content: orchestration.assistantMessage,
  metadata: toJsonValue({
    orchestration,
    toolParts: orchestration.toolParts ?? [],
    citations: orchestration.citations ?? [],
  }),
});
```

- [ ] **Step 5: Keep `AgentRun` creation only for explicit execution turns**

Preserve the current branch:

```ts
if (!orchestration.createRun) {
  return { message, assistantMessage, orchestration, run: null };
}
```

The new tool loop must live entirely inside the no-run path.

- [ ] **Step 6: Add orchestrator and chat service tests**

Extend specs with cases like:

```ts
it('returns assistant message with toolParts when the turn uses rag_search', async () => { ... });
it('does not create AgentRun for read-only tool usage', async () => { ... });
it('persists AgentChatToolCall rows for each tool invocation', async () => { ... });
```

- [ ] **Step 7: Run focused verification**

Run: `pnpm test -- agent-chat-orchestrator agent-chat.service`
Expected: both specs pass with the new tool loop behavior.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/agents/agent-chat-orchestrator.service.ts apps/api/src/agents/agent-chat.service.ts apps/api/src/agents/agent-chat-orchestrator.service.spec.ts apps/api/src/agents/agent-chat.service.spec.ts
git commit -m "feat: add conversational tool loop to agent chat"
```

---

## Task 5: Migrate Frontend Chat Rendering to Agent Elements Tool Components

**Files:**
- Create: `apps/web/src/core/modules/agents/components/chat/chat-tool-part-adapter.ts`
- Create: `apps/web/src/core/modules/agents/components/chat/chat-tool-sections.ts`
- Modify: `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx`
- Test: manual verification via app + `pnpm typecheck`

- [ ] **Step 1: Type assistant metadata for `toolParts` cleanly**

In `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`, extend the metadata typing:

```ts
export type ChatToolPart = {
  type: string;
  toolCallId?: string;
  state?: 'input-streaming' | 'output-available' | 'output-error';
  input?: Record<string, unknown>;
  output?: unknown;
};

export type ChatMessageMetadata = {
  attachments?: ChatAttachment[];
  toolParts?: ChatToolPart[];
  citations?: Array<{ label: string; url?: string; sourceType?: string; sourceId?: string }>;
};
```

- [ ] **Step 2: Create a dedicated adapter from backend metadata to `agent-elements` semantics**

Create `apps/web/src/core/modules/agents/components/chat/chat-tool-part-adapter.ts`:

```ts
export function adaptBackendToolParts(toolParts: ChatToolPart[]) {
  return toolParts.map((part) => {
    if (part.type === 'tool-Search') return part;
    return {
      ...part,
      type: 'tool-Search',
      output: {
        results: Array.isArray((part.output as any)?.results) ? (part.output as any).results : [],
        summary: (part.output as any)?.summary,
      },
    };
  });
}
```

- [ ] **Step 3: Centralize message tool-section building around `agent-elements`**

Create `apps/web/src/core/modules/agents/components/chat/chat-tool-sections.ts`:

```ts
export function buildChatToolSections(message: ChatMessage) {
  const storedParts = getStoredToolParts(message.metadata);
  if (storedParts.length > 0) {
    return groupToolParts(adaptBackendToolParts(storedParts));
  }

  return fallbackWorkflowSections(message);
}
```

- [ ] **Step 4: Update `chat-message-parts.ts` to prefer stored `toolParts` over custom heuristics**

Modify `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts` so that:

```ts
const metadataSections = buildChatToolSections(message);
if (metadataSections.length > 0) {
  return metadataSections;
}
```

Keep the existing workflow-step fallback only for old messages or run-only states.

- [ ] **Step 5: Make the assistant bubble rely on `ToolRenderer`, `ToolGroup`, `GenericTool` and `SearchTool`**

In `apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx`, keep using the existing renderer pipeline but make sure the stored metadata path is primary:

```tsx
{toolSections.map(({ part, nestedTools }) => (
  <ToolRenderer key={part.toolCallId ?? part.type} part={part} nestedTools={nestedTools} chatStatus="ready" />
))}
```

Do not add a parallel bespoke tool-card tree.

- [ ] **Step 6: Ensure grouping/fallback rules match the spec**

When multiple tool calls appear in one turn, let `ToolGroup` do the collapse. When a tool has no specialized renderer, let `GenericTool` absorb it.

No custom branch like this should remain:

```tsx
if (part.type === 'custom-web-card') {
  return <MySpecialCard />;
}
```

unless there is no matching `agent-elements` component.

- [ ] **Step 7: Run frontend verification**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected:
- typecheck passes
- lint status is understood and documented; if the repo already has unrelated lint debt, confirm that this change does not add new agent-chat-specific lint regressions.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-agent-chat.ts apps/web/src/core/modules/agents/components/chat/chat-tool-part-adapter.ts apps/web/src/core/modules/agents/components/chat/chat-tool-sections.ts apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx
git commit -m "feat: render agent chat tools with agent elements"
```

---

## Task 6: Add Agent Tool Allowlist UI in Settings

**Files:**
- Modify: `apps/web/src/core/modules/agents/hooks/use-agents.ts`
- Modify: `apps/web/src/core/modules/agents/pages/agent-settings-page.tsx`
- Test: `apps/web` typecheck + manual UI verification

- [ ] **Step 1: Extend the frontend agent type with `allowedTools`**

In `apps/web/src/core/modules/agents/hooks/use-agents.ts`:

```ts
allowedTools?: Array<'rag_search' | 'file_search' | 'web_research'>;
```

Make sure create/update payloads support it too.

- [ ] **Step 2: Add a settings section for tool allowlist**

In `apps/web/src/core/modules/agents/pages/agent-settings-page.tsx`, add a card-like section with three toggles or checkboxes:

```tsx
<PermissionGate permission="agent.update">
  <div className="space-y-4">
    <h3>Ferramentas habilitadas</h3>
    <ToolToggle value="rag_search" label="Consulta RAG" />
    <ToolToggle value="file_search" label="Pesquisa em arquivos" />
    <ToolToggle value="web_research" label="Pesquisa web" />
  </div>
</PermissionGate>
```

- [ ] **Step 3: Persist the allowlist using the existing agent update mutation**

Keep the write path simple:

```ts
updateAgent.mutate({
  allowedTools: nextAllowedTools,
});
```

Do not create a dedicated endpoint for this phase.

- [ ] **Step 4: Add explanatory copy**

The settings copy should explain:

- tools are per-agent
- this only affects the chat tool loop
- workflow blocks are not part of this phase

Example copy:

```tsx
<p className="text-[12px] text-[var(--fg-tertiary)]">
  Estas ferramentas ficam disponíveis para o agente durante a conversa. Nesta fase, elas não alteram dados nem criam execuções de workflow por conta própria.
</p>
```

- [ ] **Step 5: Run verification**

Run: `pnpm typecheck`
Expected: settings page compiles with the new agent shape.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-agents.ts apps/web/src/core/modules/agents/pages/agent-settings-page.tsx
git commit -m "feat: add agent tool allowlist settings"
```

---

## Task 7: Full Regression and Contract Verification

**Files:**
- Modify if needed: any files from prior tasks
- Test: `apps/api/src/agents/**/*.spec.ts`

- [ ] **Step 1: Run the full backend agents suite**

Run: `pnpm test -- agents`
Expected: all agents specs pass.

- [ ] **Step 2: Run API typecheck**

Run: `pnpm typecheck`
Expected: no TypeScript errors in `apps/api`.

- [ ] **Step 3: Run web typecheck**

Run: `pnpm typecheck`
Expected: no TypeScript errors in `apps/web`.

- [ ] **Step 4: Smoke-test the manual UX**

Run:

```bash
pnpm --dir apps/api dev
pnpm --dir apps/web dev
```

Then verify manually:

- an agent with `rag_search` enabled can answer with a visible search tool row
- an agent with no enabled tools does not use them
- `file_search` results render as search-style tool results
- unknown tool parts fall back to `GenericTool`
- multiple tool calls in one turn collapse via `ToolGroup`
- no `AgentRun` is created for a read-only tool turn

- [ ] **Step 5: Fix any failures found in verification**

If a failure occurs, patch only the minimal relevant file and rerun the exact failing command before rerunning the full suite.

- [ ] **Step 6: Final commit**

```bash
git add apps/api apps/web
git commit -m "feat: add conversational chat tool runtime"
```

---

## Spec Coverage Check

- `AgentToolRuntime` shared backend layer: covered by Tasks 2 and 3.
- Three phase-1 read-only tools: covered by Task 3.
- Allowlist per agent: covered by Tasks 1 and 6.
- Message metadata + `AgentChatToolCall`: covered by Tasks 1 and 4.
- Agent Elements requirement in chat: covered by Task 5.
- No forced `AgentRun` for read-only tool turns: covered by Task 4 and verified in Task 7.
- Reuse path for future workflow integration: preserved by Task 3 design, without implementing workflow blocks now.

## Placeholder Scan

- No `TBD`, `TODO`, or deferred code placeholders remain in the task steps.
- The only intentionally abstracted point is the external `webResearchGateway`, which is explicitly called out as an adapter boundary so implementation can bind to the chosen provider without changing runtime semantics.

## Type Consistency Check

- Backend canonical tool names are fixed to `rag_search`, `file_search`, `web_research` across DTOs, policy, runtime, settings UI, and frontend types.
- Frontend tool rendering stays aligned to `toolParts` consumed by `ToolRenderer` and `agent-elements`.
- `AgentRun` remains separate from the chat tool runtime by design.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-29-agent-chat-tool-runtime-implementation-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
