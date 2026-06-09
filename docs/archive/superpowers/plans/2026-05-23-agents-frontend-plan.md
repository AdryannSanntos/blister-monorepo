# Agents Frontend Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a experiencia completa de agentes no frontend em modo conversation-first, com builder de workflow alinhado ao novo runtime, chat com eventos visiveis de IA, subagentes inline, formularios/clarificacoes retomando a mesma run e renderer final de output UI tipado.

**Architecture:** O frontend continua dentro de `apps/web`, mas a experiencia de agentes passa a ser guiada por tres pilares: builder unificado por schema, chat centrado em conversa/orquestracao visivel e tela de execucoes voltada para auditoria de runs, arvore pai-filho e snapshots. A implementacao deve reutilizar ao maximo `agent-elements`, `@xyflow/react` e os componentes/tokens oficiais do projeto.

**Tech Stack:** Next.js 16, React 19, TanStack Query, nuqs, shadcn/ui, Tailwind CSS v4, `@xyflow/react`, `agent-elements`, lucide-react.

---

## Mandatory Reading and Skill Order

This plan must be executed following the project rules below.

### Read before touching any agents frontend file

1. `CLAUDE.md`
2. `docs/README.md`
3. `docs/agents-flow.md`
4. `docs/superpowers/specs/2026-05-23-agents-conversation-first-rag-design.md`
5. `docs/skills/agents-skill.md`
6. `docs/design-system/README.md`
7. `docs/design-system/usage-rules.md`
8. `apps/web/AGENTS.md`

### Mandatory skills

- `company-os-frontend`
- `company-os-design`
- `agent-elements`
- `react-flow`

### Non-negotiable frontend rules for this plan

- Use the project design tokens only
- Use `PageLayout` / `AgentContentLayout` / official shells as appropriate
- Do not introduce a competing UI library
- Reuse `agent-elements` before inventing custom chat primitives
- Keep all workflow blocks visually consistent in the canvas
- Use `@xyflow/react` rules from the project and skill docs
- Keep chat simple for the user: no hidden workflow jargon leaking into the UX
- Every action that requires permission must stay behind `PermissionGate`
- Keep state in React Query and URL state in `nuqs` when appropriate

---

## Product UX Rules to Encode in the Frontend

- Agent chat is conversation-first, not auto-execution-first
- Not every message creates a run
- AI orchestration steps must appear in chat as visible UI
- Subagents stay inside the parent chat
- Clarification, form, and validation resume the same run
- The workflow builder uses a single visual language for all blocks
- Final outputs render from the backend UI envelope, not from heuristics
- The builder must support named ports, multiple incoming connections, and multiple outgoing connections where the block type allows it

---

## File Structure

### Files to create

- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/decision-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/boolean-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/if-else-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/agent-call-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/clarification-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/form-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/validation-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/output-formatter-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-configs/finalizer-config-panel.tsx`
- `apps/web/src/core/modules/agents/components/chat/agent-orchestration-event.tsx`
- `apps/web/src/core/modules/agents/components/chat/agent-clarification-card.tsx`
- `apps/web/src/core/modules/agents/components/chat/agent-form-card.tsx`
- `apps/web/src/core/modules/agents/components/chat/agent-validation-card.tsx`
- `apps/web/src/core/modules/agents/components/chat/subagent-run-card.tsx`
- `apps/web/src/core/modules/agents/components/output/ui-output-renderer.tsx`
- `apps/web/src/core/modules/agents/components/output/output-block-renderers/*.tsx`
- `apps/web/src/core/modules/agents/hooks/use-agent-context.ts`
- `apps/web/src/core/modules/agents/hooks/use-agent-run-resume.ts`

### Files to modify

- `apps/web/src/core/modules/agents/pages/agent-chat-page.tsx`
- `apps/web/src/core/modules/agents/pages/agent-workflow-page.tsx`
- `apps/web/src/core/modules/agents/pages/agent-executions-page.tsx`
- `apps/web/src/core/modules/agents/pages/agent-settings-page.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/block-types.ts`
- `apps/web/src/core/modules/agents/components/flow-builder/workflow-sidebar.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/flow-block-node.tsx`
- `apps/web/src/core/modules/agents/components/flow-builder/flow-canvas.tsx`
- `apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx`
- `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`
- `apps/web/src/core/modules/agents/components/chat/execution-inline-card.tsx`
- `apps/web/src/core/modules/agents/components/executions/execution-timeline.tsx`
- `apps/web/src/core/modules/agents/components/executions/run-detail-sheet.tsx`
- `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`
- `apps/web/src/core/modules/agents/hooks/use-agent-runs.ts`
- `apps/web/src/core/modules/agents/hooks/use-agents.ts`

---

## Screen-by-Screen Target

## 1. Agent Chat screen

### Main responsibilities

- primary place where the user interacts with the agent
- supports conversation-only turns
- supports visible orchestration turns
- supports execution runs when needed
- supports subagent activity inline
- supports clarification/form/validation cards inline
- renders final UI output blocks cleanly

### Layout expectations

- keep existing `AgentContentLayout`
- preserve spacing rules from `docs/skills/agents-skill.md`
- maintain sticky composer/footer area
- preserve `AgentInactiveDialog` blocking behavior for inactive agents

### Required states

- welcome state with quick prompts
- read-only state when user lacks `agent.execute`
- conversational turn with no run
- orchestration-only turn showing context/reference/intention events
- active run with progress
- paused run awaiting clarification/form/validation
- subagent active inside parent chat
- final UI output rendered from contract

## 2. Agent Workflow screen

### Main responsibilities

- keep a single visual node language
- expose the approved phase 1 block catalog
- edit per-block schemas in the sidebar
- persist graph structure aligned to backend DTOs
- keep save -> publish -> activate flow as one action

### Block visual rule

- one base node component for every block type
- icon/label/summary/config changes by type only
- no bespoke node layout per block category

### Port and connection model in the builder

The builder must not assume one input and one output per node.

It must support:

- named output handles
- named input handles
- one output connected to many downstream blocks
- one block waiting for many incoming connections
- per-block rules about which ports are shown

### Required port behaviors by block

| Block | Input handles | Output handles | Notes |
|---|---|---|---|
| `input` | none | `payload` | `payload` can fan out to many blocks |
| `decision` | `subject` | dynamic named routes | used for more than binary branching |
| `boolean` | `subject` | `true`, `false` | fixed binary output |
| `if_else` | `condition`, optional `payload` | `if`, `else` | condition and payload may come from different sources |
| `agent_call` | `request`, optional support ports | `result` | support ports may feed child input composition |
| `clarification` | `question_basis`, optional support ports | `answer` | multiple upstream values may build the question |
| `form` | `form_basis`, optional support ports | `answers` | AI-generated options can use several upstream inputs |
| `validation` | `candidate`, optional `criteria`, optional `reference` | `pass`, `fail`, `needs_review` | explicit multi-input + multi-output block |
| `output_formatter` | one or more content ports | `ui_output` | combines multiple sources into final envelope |
| `finalizer` | one or more terminal ports | `final` | consolidates final output + metadata |

### Variations the builder must support safely

1. `input.payload` connected to both `decision.subject` and `form.form_basis`.
2. `boolean.true` and `boolean.false` connected to two different blocks.
3. `if_else` receiving condition from one block and payload from another.
4. `agent_call` receiving primary request plus two supporting inputs.
5. `validation` receiving candidate output and reference output from different branches.
6. `output_formatter` receiving parent branch output plus child agent result.
7. `finalizer` receiving formatted output plus an extra terminal metadata channel.

### Required categories

- `essentials`
- `logic`
- `interaction`
- `delivery`

### Required phase 1 block list

- `input`
- `decision`
- `boolean`
- `if_else`
- `agent_call`
- `clarification`
- `form`
- `validation`
- `output_formatter`
- `finalizer`

## 3. Agent Executions screen

### Main responsibilities

- audit-oriented list of runs
- show running/queued/paused/error/completed states
- support parent-child run inspection
- show context snapshot summary
- show suspension/review state clearly

### Required detail surfaces

- timeline by block
- child runs tree
- suspension history
- final UI output preview
- raw structured metadata only where operationally useful

## 4. Agent Settings screen

### Main responsibilities

- manage basic agent identity
- manage persistent agent context profile
- manage agent-owned files
- manage references to company sources/assets/context

### Required UX constraints

- keep this operational and simple
- do not turn this into a giant setup form
- use small focused sections/cards
- protect write actions with `PermissionGate permission="agent.update"`

---

## Task 1: Expand block catalog and block type contracts in the frontend

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/flow-builder/block-types.ts`
- Test: `apps/web/src/core/modules/agents/components/flow-builder/block-types.spec.ts`

- [ ] **Step 1: Write failing test for the approved phase 1 block list**

```ts
it('exposes the approved phase 1 block list', () => {
  expect(Object.keys(BLOCK_TYPES)).toEqual([
    'input',
    'decision',
    'boolean',
    'if_else',
    'agent_call',
    'clarification',
    'form',
    'validation',
    'output_formatter',
    'finalizer',
  ]);
});
```

- [ ] **Step 2: Replace old catalog with the approved phase 1 catalog**

Preserve:

- design tokens
- category definitions
- icon mapping
- step icon fallback logic

- [ ] **Step 3: Add concise descriptions aligned to `docs/agents-flow.md`**

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/web test block-types -- --runInBand`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/agents/components/flow-builder/block-types.ts apps/web/src/core/modules/agents/components/flow-builder/block-types.spec.ts
git commit -m "feat(web): align frontend block catalog with phase 1 workflow model"
```

## Task 2: Keep a single visual node and move differences into config panels

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/flow-builder/flow-block-node.tsx`
- Modify: `apps/web/src/core/modules/agents/components/flow-builder/workflow-sidebar.tsx`
- Create: `apps/web/src/core/modules/agents/components/flow-builder/block-configs/*.tsx`

- [ ] **Step 1: Write failing test that every block uses the same base node component**

```tsx
it('renders every block through the same base node shell', () => {
  render(<FlowBlockNode data={{ blockType: 'form' }} ... />);
  expect(screen.getByTestId('workflow-block-shell')).toBeInTheDocument();
});
```

- [ ] **Step 2: Refactor `FlowBlockNode` to a single shell with dynamic summary slots**

Summary examples:

- `form`: `3 perguntas configuradas`
- `agent_call`: `Chama agente selecionado`
- `validation`: `Validacao interna ou humana`

- [ ] **Step 3: Move config editing into dedicated sidebar panels per block**

Each panel should edit only the schema for its block type.

- [ ] **Step 4: Make node shell capable of rendering multiple named handles**

Important React Flow rules to preserve:

- unique handle `id` for same-side multiples
- use `visibility: hidden` or `opacity: 0`, never `display: none`
- call `useUpdateNodeInternals` when ports change dynamically from config

- [ ] **Step 5: Ensure React Flow rules remain respected**

Check:

- explicit container height
- `nodeTypes` stability
- `nodrag` for inputs
- no `display: none` on handles

- [ ] **Step 6: Run lint and targeted component tests**

Run: `pnpm --filter @company-os/web lint && pnpm --filter @company-os/web test flow-block-node -- --runInBand`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/core/modules/agents/components/flow-builder
git commit -m "feat(web): unify workflow node visuals and add block config panels"
```

## Task 2A: Implement named handles, edge metadata, and multi-connection UX in the builder

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/flow-builder/flow-canvas.tsx`
- Modify: `apps/web/src/core/modules/agents/components/flow-builder/flow-block-node.tsx`
- Modify: `apps/web/src/core/modules/agents/pages/agent-workflow-page.tsx`

- [ ] **Step 1: Write failing test for serializing named source/target ports on edges**

```ts
it('stores source and target port ids when connecting handles', () => {
  const edge = createWorkflowEdge({ source: 'boolean-1', sourceHandle: 'true', target: 'validation-1', targetHandle: 'candidate' });
  expect(edge.sourceHandle).toBe('true');
  expect(edge.targetHandle).toBe('candidate');
});
```

- [ ] **Step 2: Persist port ids from React Flow edges into workflow save payload**

- [ ] **Step 3: Add builder affordances for multi-input blocks**

Examples:

- clearer labels on handles
- hover tooltips or inline labels for named ports
- guardrails when required ports are missing

- [ ] **Step 4: Add builder affordances for multi-output blocks**

Examples:

- explicit labels for `true` / `false`
- explicit labels for `pass` / `fail` / `needs_review`
- route labels for decision blocks

- [ ] **Step 5: Cover concrete graph variations in tests**

At minimum:

- one-to-many fan-out
- many-to-one fan-in
- boolean split
- validation with `candidate` + `reference`

- [ ] **Step 6: Run tests and lint**

Run: `pnpm --filter @company-os/web test flow-canvas -- --runInBand && pnpm --filter @company-os/web lint`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/core/modules/agents/components/flow-builder/flow-canvas.tsx apps/web/src/core/modules/agents/components/flow-builder/flow-block-node.tsx apps/web/src/core/modules/agents/pages/agent-workflow-page.tsx
git commit -m "feat(web): support named multi-connection ports in workflow builder"
```

## Task 3: Update workflow page persistence to match new backend DTO shape

**Files:**
- Modify: `apps/web/src/core/modules/agents/pages/agent-workflow-page.tsx`
- Modify: `apps/web/src/core/modules/agents/hooks/use-agents.ts`

- [ ] **Step 1: Write failing test for workflow save payload shape**

```ts
it('serializes workflow nodes with block-specific config only', () => {
  const payload = serializeWorkflowForSave(nodes, edges, workflowConfig);
  expect(payload.flowDefinition.nodes[0]).toHaveProperty('type');
});
```

- [ ] **Step 2: Replace legacy prompt/label-focused config with typed block configs**

- [ ] **Step 3: Serialize edges with `sourcePortKey` and `targetPortKey`**

The saved payload must include enough detail for backend fan-in and fan-out semantics.

- [ ] **Step 4: Preserve save -> publish -> activate UX from existing page**

- [ ] **Step 5: Run tests and lint**

Run: `pnpm --filter @company-os/web test agent-workflow-page -- --runInBand && pnpm --filter @company-os/web lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/agents/pages/agent-workflow-page.tsx apps/web/src/core/modules/agents/hooks/use-agents.ts
git commit -m "feat(web): serialize workflow builder to typed phase 1 payloads"
```

## Task 4: Make agent chat conversation-first instead of always-run-first

**Files:**
- Modify: `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`
- Modify: `apps/web/src/core/modules/agents/pages/agent-chat-page.tsx`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`
- Create: `apps/web/src/core/modules/agents/components/chat/agent-orchestration-event.tsx`

- [ ] **Step 1: Extend chat message metadata typing to support orchestration events without runs**

```ts
type ChatOrchestrationEvent = {
  type: 'intent_check' | 'context_lookup' | 'reference_read' | 'execution_start';
  label: string;
  detail?: string;
};
```

- [ ] **Step 2: Render orchestration events in chat even when no run exists**

Expected outcome: the chat can show visible AI actions before workflow execution exists.

- [ ] **Step 3: Keep composer behavior simple**

The user still just writes naturally; the orchestration is system-side and visible afterward.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/web test agent-chat-page -- --runInBand`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-agent-chat.ts apps/web/src/core/modules/agents/pages/agent-chat-page.tsx apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts apps/web/src/core/modules/agents/components/chat/agent-orchestration-event.tsx
git commit -m "feat(web): render visible pre-run orchestration in agent chat"
```

## Task 5: Add inline clarification, form, and validation cards that resume the same run

**Files:**
- Create: `apps/web/src/core/modules/agents/components/chat/agent-clarification-card.tsx`
- Create: `apps/web/src/core/modules/agents/components/chat/agent-form-card.tsx`
- Create: `apps/web/src/core/modules/agents/components/chat/agent-validation-card.tsx`
- Create: `apps/web/src/core/modules/agents/hooks/use-agent-run-resume.ts`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`

- [ ] **Step 1: Write failing test for form card rendering AI-generated options**

```tsx
it('renders a form card with resolved runtime-generated options', () => {
  render(<AgentFormCard suspension={fixture} />);
  expect(screen.getByText('Publico')).toBeInTheDocument();
  expect(screen.getByText('Gestores')).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement resume mutation hook**

Suggested mutation:

`POST /organizations/:orgId/agent-runs/:runId/suspensions/:suspensionId/respond`

- [ ] **Step 3: Render clarification, form, and validation cards inline in chat**

Behavior:

- answer submission calls resume mutation
- same run continues afterward
- UI shows local pending state while submitting

- [ ] **Step 4: Ensure `form` card supports**

- AI-generated predefined options
- `other`
- free response fields
- required validation

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/web test agent-form-card -- --runInBand && pnpm --filter @company-os/web test agent-chat-page -- --runInBand`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/agents/components/chat apps/web/src/core/modules/agents/hooks/use-agent-run-resume.ts
git commit -m "feat(web): add inline run resume cards for clarification form and validation"
```

## Task 6: Show subagents inline in the parent chat

**Files:**
- Create: `apps/web/src/core/modules/agents/components/chat/subagent-run-card.tsx`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`
- Modify: `apps/web/src/core/modules/agents/components/chat/execution-inline-card.tsx`

- [ ] **Step 1: Write failing test for parent chat showing child run info**

```tsx
it('renders subagent execution inline under the parent message flow', () => {
  render(<SubagentRunCard childRun={fixture} />);
  expect(screen.getByText('Subagente')).toBeInTheDocument();
});
```

- [ ] **Step 2: Render child run cards under parent execution context**

Show:

- child agent label
- status
- current waiting state when applicable
- final output summary

- [ ] **Step 3: Keep detail in parent chat, not navigation away**

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/web test subagent-run-card -- --runInBand`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/agents/components/chat/subagent-run-card.tsx apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts apps/web/src/core/modules/agents/components/chat/execution-inline-card.tsx
git commit -m "feat(web): display subagent runs inline in parent chat"
```

## Task 7: Replace heuristic final output rendering with a UI envelope renderer

**Files:**
- Create: `apps/web/src/core/modules/agents/components/output/ui-output-renderer.tsx`
- Create: `apps/web/src/core/modules/agents/components/output/output-block-renderers/*.tsx`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx`
- Modify: `apps/web/src/core/modules/agents/components/executions/run-detail-sheet.tsx`

- [ ] **Step 1: Write failing test for rendering markdown + image + CTA blocks**

```tsx
it('renders the backend ui envelope deterministically', () => {
  render(<UiOutputRenderer output={fixture} />);
  expect(screen.getByText('Resultado final')).toBeInTheDocument();
  expect(screen.getByRole('img')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Baixar' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement renderer for supported block types**

Support at least:

- `text`
- `markdown`
- `list`
- `card`
- `image`
- `cta`

- [ ] **Step 3: Use renderer in chat and run detail surfaces**

- [ ] **Step 4: Remove fallback heuristics only when backend contract is present**

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/web test ui-output-renderer -- --runInBand`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/agents/components/output apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx apps/web/src/core/modules/agents/components/executions/run-detail-sheet.tsx
git commit -m "feat(web): render final agent output from typed ui envelope"
```

## Task 8: Expand executions page and detail sheet for auditability

**Files:**
- Modify: `apps/web/src/core/modules/agents/pages/agent-executions-page.tsx`
- Modify: `apps/web/src/core/modules/agents/components/executions/execution-timeline.tsx`
- Modify: `apps/web/src/core/modules/agents/components/executions/run-detail-sheet.tsx`
- Modify: `apps/web/src/core/modules/agents/hooks/use-agent-runs.ts`

- [ ] **Step 1: Add support for paused/waiting states and lineage in run types**

- [ ] **Step 2: Show parent-child tree, waiting reason, and context snapshot summary in detail sheet**

- [ ] **Step 3: Keep guards for invalid dates and nullable numeric costs**

This rule already exists in current code and must be preserved.

- [ ] **Step 4: Run tests and lint**

Run: `pnpm --filter @company-os/web test run-detail-sheet -- --runInBand && pnpm --filter @company-os/web lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/agents/pages/agent-executions-page.tsx apps/web/src/core/modules/agents/components/executions/execution-timeline.tsx apps/web/src/core/modules/agents/components/executions/run-detail-sheet.tsx apps/web/src/core/modules/agents/hooks/use-agent-runs.ts
git commit -m "feat(web): expand agent executions audit surfaces"
```

## Task 9: Add agent context management in settings page

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-agent-context.ts`
- Modify: `apps/web/src/core/modules/agents/pages/agent-settings-page.tsx`

- [ ] **Step 1: Add context hooks for profile, files, and references**

- [ ] **Step 2: Add settings sections**

- agent identity
- agent instructions/context
- agent-owned files
- company references linked to the agent

- [ ] **Step 3: Keep forms short and operational**

Do not create an overwhelming setup screen. Use focused cards and contextual actions.

- [ ] **Step 4: Wrap writes in `PermissionGate permission="agent.update"`**

- [ ] **Step 5: Run lint**

Run: `pnpm --filter @company-os/web lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-agent-context.ts apps/web/src/core/modules/agents/pages/agent-settings-page.tsx
git commit -m "feat(web): add persistent agent context management ui"
```

---

## Final Verification

- [ ] Run: `pnpm --filter @company-os/web lint`
- [ ] Run: `pnpm --filter @company-os/web typecheck`
- [ ] Run: `pnpm --filter @company-os/web test`

Expected: no UI regressions, no route/layout breakage, no design-system violations in the new agent experience.
