# Agents Skill — Blister OS

> Fonte: [`docs/agents/README.md`](../agents/README.md) · SDK rule: `.cursor/rules/agent-sdk-monolith.mdc`

## Objetivo

Criar ou alterar agentes **somente** em `packages/agent-sdk`.

## IDs

**Default:** `research`, `cuts`, `video_editor`  
**Marketplace:** `planning`, `script`, `thumbnail`, `distribution`

Deprecated: `strategist`, `copywriter`, `designer`, `post`

## Estrutura SDK obrigatória

```
packages/agent-sdk/src/agents/<agentId>/
  agent.ts
  schemas/
  prompts/
  learning/feedback-handler.ts
```

## Workflow

Multi-step **inside one agent** via SDK `WorkflowEngine`.  
StepResult: CONTINUE | PAUSED | FAILED | COMPLETE.

## Isolation

- No output auto-feed to another agent
- User triggers each run explicitly
- Review on run endpoints after COMPLETE

## RAG

`retrieve_context` filtered by `workspaceId`. Boost `AGENT_LEARNING` per `agentId`.

## Credits

Debit on `generate_*` steps.

## API surface (Nest)

```
POST /api/agents/:agentId/run
POST /api/agents/runs/:runId/resume
POST /api/agents/runs/:runId/approve|reject
PATCH /api/agents/runs/:runId/output
```

## Docs

Each agent: `docs/agents/<agentId>/README.md`

## UI labels

Operational PT-BR — hide technical IDs from users.
