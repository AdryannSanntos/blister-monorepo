# Agents V1 Contract Decision (2026-05-22)

## Context

Product and engineering alignment for the first complete delivery of the Agents domain in Workana AI.

## Decision

Adopt a custom-agent-first V1 with full-focus chat/workflow experiences and execution orchestration in layered context retrieval.

## Mandatory V1 Rules

- Agent workflow is versioned by agent, never by user preference.
- Company chat always runs through a system internal context agent.
- Delegation to specialized agents keeps the main response in company chat.
- Agent execution detail is viewed in the delegated agent execution history.
- Chat supports edit message, regenerate, copy, and branching on edit.
- Execution timeline is detailed and safe; internal hidden reasoning is not exposed.
- During active execution, current conversation input is blocked.
- Company execution concurrency is capped at 3 running runs; overflow is queued FIFO.
- Automatic retry is 1 attempt and remains in the same run timeline.
- Context retrieval is permission-aware and excludes credentials/secrets.
- Storage for generated files is S3-compatible with references in run payload.
- Only custom company agents are visible in V1 catalog.

## Layout Rules

- Company chat and workflow editing use full-focus layout (not dashboard shell).
- Dashboard sidebar includes collapsible list of company agents.
- Each agent has a single full-focus workspace with internal navigation:
  - Chat
  - Workflow
  - Executions
  - Settings

## Context Retrieval Order

1. Current conversation state
2. Relevant memory from previous chats of same agent
3. Structured company data retrieval
4. RAG retrieval (pgvector) over textual artifacts
5. Unified rerank and source formatting

## Sources Covered in V1 Context

- Brain
- Context sources
- Design system
- Assets
- Agents and workflows
- Runs and execution summaries
- Credits
- Members
- Integration metadata

## Security Constraints

- Respect requesting user permissions for every retrieval source.
- Never expose API keys, tokens, cookies, integration credentials, encrypted secrets, or hidden internal prompts.
- Keep `userId` from `req.currentUser.id` only.

## Related Plans

- `docs/superpowers/plans/2026-05-22-agents-context-execution-core.md`
- `docs/superpowers/plans/2026-05-22-agents-full-focus-chat-workflow.md`
- `docs/superpowers/plans/2026-05-22-agents-docs-rules-alignment.md`
