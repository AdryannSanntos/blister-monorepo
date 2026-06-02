import type { DisplayMessage } from "../../lib/agent-chat-display-state";
import type { DisplayToolStatus } from "../../lib/agent-chat-event-reducer";

/** Tool part shape consumed by `agent-elements` `ToolRenderer`. */
export type AdaptedToolPart = {
  type: string;
  toolCallId: string;
  state: "input-streaming" | "output-available" | "output-error";
  input: Record<string, unknown>;
  output?: unknown;
};

export type AdaptedToolSection = {
  part: AdaptedToolPart;
  nestedTools: AdaptedToolPart[];
};

const TOOL_LABELS: Record<string, string> = {
  next_action_analysis: "Analisou a solicitacao",
  rag_search: "Consultou contexto da empresa",
  file_search: "Pesquisou arquivos do contexto",
  web_research: "Pesquisou fontes externas",
};

function toToolState(status: DisplayToolStatus): AdaptedToolPart["state"] {
  if (status === "completed") return "output-available";
  if (status === "failed") return "output-error";
  return "input-streaming";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Visual family of a retrieved source — drives the row icon and label. */
export type SourceKind =
  | "file"
  | "brain"
  | "design"
  | "asset"
  | "web"
  | "company"
  | "document";

type RetrievedSource = { title: string; sourceKind: SourceKind };

function readField(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  const field = value[key];
  return typeof field === "string" && field.trim().length > 0
    ? field.trim()
    : undefined;
}

function readResultTitle(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return (
    readField(value, "title") ??
    readField(value, "filename") ??
    readField(value, "url") ??
    null
  );
}

/**
 * Classifies a retrieval result into a visual source family so the row can be
 * shown the right way: an uploaded file reads differently from the company
 * brain, the design system, or an external web source.
 */
function classifySource(result: Record<string, unknown>): SourceKind {
  if (readField(result, "sourceId") === "__company_context__") return "company";

  switch (readField(result, "sourceType")) {
    case "brain_entry":
      return "brain";
    case "design_system":
    case "design_asset":
      return "design";
    case "asset":
      return "asset";
    case "web_research":
      return "web";
    case "agent_context_file":
    case "context_source":
      return "file";
    case "manual":
      return "document";
  }

  const origin = readField(result, "origin");
  if (origin === "agent_context_file") return "file";
  if (origin === "web_research") return "web";
  return "document";
}

/** Unique sources a retrieval tool surfaced (deduped by title), in order. */
function dedupeRetrievedSources(
  output: Record<string, unknown>,
): RetrievedSource[] {
  const results = Array.isArray(output.results) ? output.results : [];
  const seen = new Set<string>();
  const sources: RetrievedSource[] = [];
  for (const result of results) {
    const title = readResultTitle(result);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    sources.push({
      title,
      sourceKind: isRecord(result) ? classifySource(result) : "document",
    });
  }
  return sources;
}

function pluralLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Maps the conversation tool calls of a display message into a single collapsible
 * `tool-Task` group whose rows are directed at the concrete files/contexts read
 * (one row per source), so the narrative is "what was consulted" rather than a
 * generic action. Every retrieval call is represented: a completed call expands
 * into one row per unique source, while a pending or empty call keeps a single
 * search-level row. Rendered via `ToolGroup` + the `tool-Search` registry entry.
 *
 * The internal `next_action_analysis` routing step is dropped: users only care
 * about the actions actually taken, never the agent's private routing decision.
 */
export function buildToolSections(
  message: DisplayMessage,
): AdaptedToolSection[] {
  const visibleToolCalls = message.toolCalls.filter(
    (tool) => tool.toolName !== "next_action_analysis",
  );
  if (visibleToolCalls.length === 0) return [];

  const groupId = `msg-${message.id}-tools`;
  const nestedTools: AdaptedToolPart[] = [];
  const seenSources = new Set<string>();
  let sourceCount = 0;

  for (const tool of visibleToolCalls) {
    const output = isRecord(tool.output) ? tool.output : {};
    const sources = dedupeRetrievedSources(output);
    const isDone = tool.status === "completed";

    // A finished retrieval that surfaced sources expands into one row per unique
    // source (deduped across searches), each directed at the file it read and
    // typed so the row renders with the right icon and label.
    if (isDone && sources.length > 0) {
      sources.forEach((source, i) => {
        if (seenSources.has(source.title)) return;
        seenSources.add(source.title);
        sourceCount += 1;
        nestedTools.push({
          type: "tool-Search",
          toolCallId: `${groupId}:${tool.toolCallId}:src-${i}`,
          state: "output-available",
          input: {
            toolName: tool.toolName,
            fileTitle: source.title,
            sourceKind: source.sourceKind,
          },
        });
      });
      continue;
    }

    // Pending, failed, or empty searches keep a single search-level row so the
    // activity is still surfaced (shimmer while running, "nenhum resultado" once
    // done with no hits).
    nestedTools.push({
      type: "tool-Search",
      toolCallId: `${groupId}:${tool.toolCallId}`,
      state: toToolState(tool.status),
      input: {
        query: typeof tool.input.query === "string" ? tool.input.query : "",
        toolName: tool.toolName,
        label: TOOL_LABELS[tool.toolName] ?? tool.toolName,
      },
      output:
        tool.status === "failed"
          ? { error: tool.errorMessage ?? "A ferramenta falhou." }
          : {
              ...output,
              results: Array.isArray(output.results) ? output.results : [],
            },
    });
  }

  const anyActive = visibleToolCalls.some(
    (tool) => tool.status === "pending" || tool.status === "running",
  );
  const groupActive = anyActive && message.isStreaming;
  const summaryLabel =
    sourceCount > 0
      ? pluralLabel(sourceCount, "fonte", "fontes")
      : pluralLabel(visibleToolCalls.length, "pesquisa", "pesquisas");

  return [
    {
      part: {
        type: "tool-Task",
        toolCallId: groupId,
        state: groupActive ? "input-streaming" : "output-available",
        input: {
          subagent_type: "Pesquisa",
          description: "Pesquisando contexto",
          summaryLabel,
        },
        output: groupActive ? undefined : { status: "completed" },
      },
      nestedTools,
    },
  ];
}
