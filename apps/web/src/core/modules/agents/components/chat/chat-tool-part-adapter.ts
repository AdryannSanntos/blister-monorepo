import type { ChatToolPart } from "src/core/modules/agents/hooks/use-agent-chat";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Adapts backend tool parts to the `agent-elements` semantics. The backend
 * already emits `tool-Search` envelopes for the phase-1 read-only tools; anything
 * unrecognized is coerced into a `tool-Search` so it renders inside the official
 * search renderer instead of an ad-hoc card.
 */
export function adaptBackendToolParts(
  toolParts: ChatToolPart[],
): ChatToolPart[] {
  return toolParts.map((part) => {
    if (part.type === "tool-Search") {
      return part;
    }

    const output = isRecord(part.output) ? part.output : {};
    return {
      ...part,
      type: "tool-Search",
      output: {
        ...output,
        results: Array.isArray(output.results) ? output.results : [],
        summary:
          typeof output.summary === "string" ? output.summary : undefined,
      },
    };
  });
}
