import { describe, expect, it } from "vitest";
import type { DisplayMessage } from "../../lib/agent-chat-display-state";
import type { DisplayToolCall } from "../../lib/agent-chat-event-reducer";
import { buildToolSections } from "./chat-replay-adapter";

function message(
  toolCalls: DisplayToolCall[],
  isStreaming = false,
): DisplayMessage {
  return {
    id: "m1",
    role: "assistant",
    content: "",
    status: isStreaming ? "streaming" : "completed",
    isStreaming,
    errorMessage: null,
    citations: [],
    toolCalls,
    attachments: [],
    createdAt: null,
  };
}

const tool = (overrides: Partial<DisplayToolCall>): DisplayToolCall => ({
  toolCallId: "t1",
  groupId: "tools",
  toolName: "rag_search",
  status: "completed",
  input: { query: "x" },
  output: { summary: "ok", results: [] },
  errorMessage: null,
  displayOrder: 0,
  ...overrides,
});

describe("buildToolSections", () => {
  it("returns no sections when there are no tool calls", () => {
    expect(buildToolSections(message([]))).toEqual([]);
  });

  it("wraps tool calls in a single tool-Task group of tool-Search rows", () => {
    const [section] = buildToolSections(message([tool({})]));
    expect(section.part.type).toBe("tool-Task");
    expect(section.nestedTools).toHaveLength(1);
    expect(section.nestedTools[0].type).toBe("tool-Search");
  });

  it("maps a completed tool to output-available state", () => {
    const [section] = buildToolSections(
      message([tool({ status: "completed" })]),
    );
    expect(section.nestedTools[0].state).toBe("output-available");
  });

  it("maps a failed tool to output-error state with the error in the output", () => {
    const [section] = buildToolSections(
      message([tool({ status: "failed", errorMessage: "boom", output: null })]),
    );
    expect(section.nestedTools[0].state).toBe("output-error");
    expect(section.nestedTools[0].output).toEqual({ error: "boom" });
  });

  it("keeps the group pending while the message streams with an unfinished tool", () => {
    const [section] = buildToolSections(
      message([tool({ status: "running" })], true),
    );
    expect(section.part.state).toBe("input-streaming");
  });

  it("drops a lone next-action-analysis step (internal routing, nothing to show)", () => {
    expect(
      buildToolSections(
        message([
          tool({
            toolCallId: "analysis",
            toolName: "next_action_analysis",
            input: { query: "Responder com o contexto atual" },
            output: { action: "respond" },
          }),
        ]),
      ),
    ).toEqual([]);
  });

  it("excludes the next-action-analysis step, keeping only retrieval rows", () => {
    const [section] = buildToolSections(
      message([
        tool({
          toolCallId: "analysis",
          toolName: "next_action_analysis",
          input: { query: "Pesquisou arquivos do contexto" },
        }),
        tool({
          toolCallId: "search",
          toolName: "file_search",
          displayOrder: 1,
        }),
      ]),
    );

    expect(section.nestedTools).toHaveLength(1);
    expect(section.nestedTools[0].input.toolName).toBe("file_search");
    expect(section.part.input.description).toBe("Pesquisando contexto");
  });

  it("emits one row per unique source read, directed at the file", () => {
    const [section] = buildToolSections(
      message([
        tool({
          toolName: "file_search",
          output: {
            results: [
              { title: "Currículo Adryan" },
              { title: "Currículo Adryan" },
              { title: "Contexto da empresa" },
            ],
          },
        }),
      ]),
    );

    expect(section.nestedTools.map((t) => t.input.fileTitle)).toEqual([
      "Currículo Adryan",
      "Contexto da empresa",
    ]);
    expect(section.part.input.summaryLabel).toBe("2 fontes");
  });

  it("classifies each source by type so rows render distinctly", () => {
    const [section] = buildToolSections(
      message([
        tool({
          toolName: "rag_search",
          output: {
            results: [
              { title: "Currículo Adryan", sourceType: "context_source" },
              {
                title: "Contexto da empresa",
                sourceType: "context_source",
                sourceId: "__company_context__",
              },
              { title: "Identidade visual", sourceType: "design_system" },
              { title: "Memória X", sourceType: "brain_entry" },
              { title: "Tendências 2026", sourceType: "web_research" },
            ],
          },
        }),
      ]),
    );

    expect(section.nestedTools.map((t) => t.input.sourceKind)).toEqual([
      "file",
      "company",
      "design",
      "brain",
      "web",
    ]);
  });

  it("dedupes the same source across multiple searches", () => {
    const [section] = buildToolSections(
      message([
        tool({
          toolCallId: "s1",
          toolName: "rag_search",
          output: { results: [{ title: "Currículo Adryan" }] },
        }),
        tool({
          toolCallId: "s2",
          toolName: "file_search",
          displayOrder: 1,
          output: {
            results: [{ title: "Currículo Adryan" }, { title: "Contexto da empresa" }],
          },
        }),
      ]),
    );

    expect(section.nestedTools.map((t) => t.input.fileTitle)).toEqual([
      "Currículo Adryan",
      "Contexto da empresa",
    ]);
  });

  it("keeps a search-level row for an empty retrieval so it is still shown", () => {
    const [section] = buildToolSections(
      message([
        tool({ toolName: "web_research", output: { results: [] } }),
      ]),
    );

    expect(section.nestedTools).toHaveLength(1);
    expect(section.nestedTools[0].input.fileTitle).toBeUndefined();
    expect(section.nestedTools[0].input.toolName).toBe("web_research");
    expect(section.part.input.summaryLabel).toBe("1 pesquisa");
  });

  it("marks the group complete once tools are done even if other tools exist", () => {
    const [section] = buildToolSections(
      message([
        tool({ toolCallId: "t1" }),
        tool({ toolCallId: "t2", displayOrder: 1 }),
      ]),
    );
    expect(section.part.state).toBe("output-available");
    expect(section.nestedTools).toHaveLength(2);
  });

  it("namespaces nested tool ids under the group to avoid collisions", () => {
    const [section] = buildToolSections(message([tool({ toolCallId: "t1" })]));
    expect(section.nestedTools[0].toolCallId).toContain("msg-m1-tools:t1");
  });
});
