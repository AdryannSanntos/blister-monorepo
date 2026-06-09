# Agent Question Pause And Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o agente pausar de verdade em `question_form`, coletar respostas em um formulário flutuante no chat e retomar a mesma run do ponto em que parou.

**Architecture:** O backend interrompe a `AgentRun` em `awaiting_user_validation`, persiste o estado mínimo de retomada em `processingMetadata` e expõe uma rota para responder perguntas e requeue da mesma run. O frontend detecta essa run pendente, tira o formulário de dentro da mensagem final, exibe um card flutuante acima do composer e registra as respostas como mensagem do usuário antes de continuar o processamento.

**Tech Stack:** NestJS 11, Prisma, Zod, Next.js 16, React 19, TanStack Query, agent-elements.

---

### Task 1: Backend Pause And Resume

**Files:**
- Modify: `apps/api/src/agents/dto/chat-message.dto.ts`
- Modify: `apps/api/src/agents/agent-chat.controller.ts`
- Modify: `apps/api/src/agents/agent-chat.service.ts`
- Modify: `apps/api/src/agents/agent-runs.service.ts`
- Modify: `apps/api/src/agents/agent-execution.service.ts`
- Test: `apps/api/src/agents/agent-chat.service.spec.ts`
- Test: `apps/api/src/agents/agent-runs.service.spec.ts`

- [x] Escrever testes para pausa em `question_form`, mensagem de resposta do usuário e retomada da run.
- [x] Validar que os testes falham antes da implementação.
- [x] Criar schema Zod para `question-answers`.
- [x] Adicionar rota de chat para responder perguntas.
- [x] Implementar `submitQuestionAnswers` no `AgentChatService`.
- [x] Implementar `resumeAwaitingRun` no `AgentRunsService`.
- [x] Fazer `AgentExecutionService` interromper a run em `question_form` e retomar a partir de `processingMetadata`.
- [x] Rodar `pnpm exec jest src/agents/agent-runs.service.spec.ts src/agents/agent-chat.service.spec.ts --runInBand`.
- [x] Rodar `pnpm typecheck` em `apps/api`.

### Task 2: Frontend Floating Question Flow

**Files:**
- Modify: `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`
- Modify: `apps/web/src/core/modules/agents/pages/agent-chat-page.tsx`

- [x] Criar mutation para responder perguntas da run.
- [x] Extrair helper para detectar `pendingQuestion` a partir da mensagem do agente.
- [x] Implementar card flutuante acima do composer usando `QuestionPrompt`.
- [x] Registrar as respostas como mensagem otimista do usuário e religar o card de processamento.
- [x] Bloquear o composer normal enquanto existir pergunta pendente.
- [x] Rodar `pnpm typecheck` em `apps/web`.

### Task 3: Message And Timeline Alignment

**Files:**
- Modify: `apps/web/src/components/agent-elements/user-message.tsx`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx`

- [x] Reaproveitar o mesmo componente base de mensagem do sistema para a resposta textual do agente.
- [x] Tirar `tool-Question` de dentro da resposta final.
- [x] Manter outputs especiais separados abaixo da mensagem quando aplicável.
- [x] Rodar `pnpm exec biome check --write ...` nos arquivos alterados.

### Task 4: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-05-23-agent-question-pause-and-resume.md`

- [x] Rodar `pnpm typecheck` em `apps/api`.
- [x] Rodar `pnpm typecheck` em `apps/web`.
- [x] Rodar `pnpm exec jest src/agents/agent-runs.service.spec.ts src/agents/agent-chat.service.spec.ts --runInBand` em `apps/api`.
- [x] Registrar este plano com o estado executado.
