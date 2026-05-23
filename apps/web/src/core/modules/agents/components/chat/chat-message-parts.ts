import type { UIMessage } from "ai";
import type { QuestionConfig } from "@/components/agent-elements/question/question-prompt";
import type {
  ChatAttachment,
  ChatMessage,
} from "src/core/modules/agents/hooks/use-agent-chat";

type ToolPart = {
  type: string;
  toolCallId?: string;
  state?: "input-streaming" | "output-available" | "output-error";
  input?: Record<string, unknown>;
  output?: unknown;
};

type ToolSection = {
  part: ToolPart;
  nestedTools?: ToolPart[];
};

type ChatMetadata = {
  attachments?: ChatAttachment[];
  toolParts?: ToolPart[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveAttachmentUrl(attachment: ChatAttachment): string | null {
  if (attachment.url) return attachment.url;
  if (!attachment.textContent) return null;

  return `data:${attachment.contentType};charset=utf-8,${encodeURIComponent(attachment.textContent)}`;
}

function getChatMetadata(metadata: unknown): ChatMetadata {
  if (!isRecord(metadata)) return {};
  return metadata as ChatMetadata;
}

export function getMessageAttachments(metadata: unknown): ChatAttachment[] {
  const value = getChatMetadata(metadata).attachments;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ChatAttachment => {
    if (!isRecord(item)) return false;
    return (
      typeof item.id === "string" &&
      typeof item.filename === "string" &&
      typeof item.contentType === "string"
    );
  });
}

export function toUserUiMessage(message: ChatMessage): UIMessage {
  const attachments = getMessageAttachments(message.metadata);
  const attachmentParts: UIMessage["parts"] = [];

  for (const attachment of attachments) {
    const url = resolveAttachmentUrl(attachment);
    if (!url) continue;

    attachmentParts.push({
      type: "file",
      filename: attachment.filename,
      mediaType: attachment.contentType,
      url,
    });
  }

  return {
    id: message.id,
    role: "user",
    metadata: { createdAt: message.createdAt },
    parts: [
      ...attachmentParts,
      ...(message.content
        ? [{ type: "text" as const, text: message.content }]
        : []),
    ],
  } as UIMessage;
}

export function getMessageToolSections(message: ChatMessage): ToolSection[] {
  const metadataSections = groupToolParts(
    getStoredToolParts(getChatMetadata(message.metadata).toolParts),
  );

  if (metadataSections.length > 0) {
    return metadataSections;
  }

  if (!message.agentRun) {
    return [];
  }

  const taskToolCallId = `run-${message.agentRun.id}`;
  const nestedTools = message.agentRun.steps
    .map((step) => buildStepTool(message.agentRun?.id ?? "run", step))
    .filter((part): part is ToolPart => Boolean(part));

  if (nestedTools.length === 0) {
    return [];
  }

  return [
    {
      part: {
        type: "tool-Task",
        toolCallId: taskToolCallId,
        state: toToolState(message.agentRun.status),
        input: {
          subagent_type: "Workflow",
          description: `Execução do agente em ${nestedTools.length} etapa${nestedTools.length === 1 ? "" : "s"}.`,
        },
        output:
          message.agentRun.status === "error"
            ? { error: "A execução terminou com erro." }
            : { status: message.agentRun.status },
      },
      nestedTools,
    },
  ];
}

function getStoredToolParts(toolParts: unknown): ToolPart[] {
  if (!Array.isArray(toolParts)) return [];
  return toolParts.filter((part): part is ToolPart => {
    if (!isRecord(part)) return false;
    return typeof part.type === "string";
  });
}

function groupToolParts(parts: ToolPart[]): ToolSection[] {
  if (parts.length === 0) return [];

  const taskIds = new Set(
    parts
      .filter(
        (part) =>
          (part.type === "tool-Task" || part.type === "tool-Agent") &&
          typeof part.toolCallId === "string",
      )
      .map((part) => part.toolCallId as string),
  );

  const nestedByParent = new Map<string, ToolPart[]>();
  const nestedIds = new Set<string>();

  for (const part of parts) {
    if (!part.toolCallId || !part.toolCallId.includes(":")) continue;
    const parentId = part.toolCallId.split(":")[0];
    if (!taskIds.has(parentId)) continue;
    const existing = nestedByParent.get(parentId) ?? [];
    existing.push(part);
    nestedByParent.set(parentId, existing);
    nestedIds.add(part.toolCallId);
  }

  return parts.flatMap((part) => {
    if (part.toolCallId && nestedIds.has(part.toolCallId)) {
      return [];
    }

    if ((part.type === "tool-Task" || part.type === "tool-Agent") && part.toolCallId) {
      return [{ part, nestedTools: nestedByParent.get(part.toolCallId) ?? [] }];
    }

    return [{ part }];
  });
}

function buildStepTool(
  runId: string,
  step: NonNullable<ChatMessage["agentRun"]>["steps"][number],
): ToolPart | null {
  const toolCallId = `run-${runId}:${step.id}`;
  const state = toToolState(step.status);

  switch (step.blockType) {
    case "input": {
      const content = stringifyPayload(step.outputPayload, "Entrada recebida.");
      return {
        type: "tool-Read",
        toolCallId,
        state,
        input: { file_path: "entrada-do-usuario.txt" },
        output: { content },
      };
    }
    case "llm_generate": {
      return {
        type: "tool-Thinking",
        toolCallId,
        state,
        input: {
          thought:
            extractPrompt(step.inputPayload) ??
            "Gerando resposta com o modelo configurado.",
        },
        output: extractText(step.outputPayload) ?? stringifyPayload(step.outputPayload),
      };
    }
    case "image_generate": {
      return {
        type: "tool-mcp__workana__image_generate",
        toolCallId,
        state,
        input: {
          prompt:
            extractPrompt(step.inputPayload) ?? "Gerando imagem a partir do contexto do workflow.",
        },
        output: {
          images: extractImages(step.outputPayload),
        },
      };
    }
    case "question_form": {
      const questions = extractQuestions(step.outputPayload, step.inputPayload);
      return {
        type: "tool-Question",
        toolCallId,
        state,
        input: {
          questions:
            questions.length > 0
              ? questions
              : [
                  {
                    kind: "text",
                    title: "Aguardando informação do usuário",
                    description:
                      "Este bloco depende de contexto adicional para continuar.",
                  },
                ],
          totalQuestions: Math.max(questions.length, 1),
          allowSkip: true,
        },
      };
    }
    case "html_validation": {
      const html = extractHtml(step.outputPayload) ?? extractHtml(step.inputPayload);
      if (!html) return null;
      return {
        type: "tool-Edit",
        toolCallId,
        state,
        input: {
          file_path: "preview.html",
          old_string: "",
          new_string: html,
        },
        output: {
          content: html,
        },
      };
    }
    case "output": {
      const content = stringifyPayload(step.outputPayload, "Saída final pronta.");
      return {
        type: "tool-Write",
        toolCallId,
        state,
        input: {
          file_path: "resultado-final.md",
          content,
        },
        output: {
          content,
        },
      };
    }
    default:
      return null;
  }
}

function toToolState(status: string): ToolPart["state"] {
  if (status === "queued" || status === "running") return "input-streaming";
  if (status === "error") return "output-error";
  return "output-available";
}

function extractPrompt(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  if (typeof payload.prompt === "string" && payload.prompt.trim().length > 0) {
    return payload.prompt;
  }

  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return payload.message;
  }

  return undefined;
}

function extractText(payload: unknown): string | undefined {
  if (typeof payload === "string") return payload;
  if (!isRecord(payload)) return undefined;
  if (typeof payload.text === "string") return payload.text;
  return undefined;
}

function extractHtml(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  if (typeof payload.html === "string") return payload.html;
  return undefined;
}

function extractImages(payload: unknown): Array<{ url?: string }> {
  if (!isRecord(payload) || !Array.isArray(payload.images)) {
    return [];
  }

  const images: Array<{ url?: string }> = [];

  for (const item of payload.images) {
    if (!isRecord(item)) continue;
    const url = typeof item.url === "string" ? item.url : undefined;
    const b64 = typeof item.b64Json === "string" ? item.b64Json : undefined;
    if (url) {
      images.push({ url });
      continue;
    }
    if (b64) {
      images.push({ url: `data:image/png;base64,${b64}` });
    }
  }

  return images;
}

function extractQuestions(...sources: unknown[]): QuestionConfig[] {
  for (const source of sources) {
    const fields = getQuestionFields(source);
    if (fields.length === 0) continue;

    return fields.map((field, index) => normalizeQuestion(index, field));
  }

  return [];
}

function getQuestionFields(source: unknown): unknown[] {
  if (!isRecord(source)) return [];

  if (isRecord(source.form) && Array.isArray(source.form.fields)) {
    return source.form.fields;
  }

  if (Array.isArray(source.fields)) {
    return source.fields;
  }

  return [];
}

function normalizeQuestion(index: number, field: unknown): QuestionConfig {
  if (!isRecord(field)) {
    return {
      kind: "text",
      title: `Pergunta ${index + 1}`,
    };
  }

  const options = normalizeOptions(field.options ?? field.choices);
  const rawType =
    typeof field.type === "string"
      ? field.type
      : typeof field.kind === "string"
        ? field.kind
        : "text";
  const kind = rawType === "single" || rawType === "radio" || rawType === "select"
    ? "single"
    : rawType === "multi" || rawType === "checkbox"
      ? "multi"
      : "text";

  return {
    kind,
    title:
      readString(field.label) ??
      readString(field.title) ??
      readString(field.name) ??
      `Pergunta ${index + 1}`,
    description: readString(field.description) ?? readString(field.helperText),
    options,
    placeholder: readString(field.placeholder),
    allowCustom: Boolean(field.allowCustom),
    customPlaceholder: readString(field.customPlaceholder),
  };
}

function normalizeOptions(options: unknown): QuestionConfig["options"] {
  if (!Array.isArray(options)) return undefined;

  const normalized = options
    .map((option, index) => {
      if (typeof option === "string") {
        return { id: option, label: option };
      }

      if (!isRecord(option)) return null;

      const id = readString(option.id) ?? readString(option.value) ?? `option-${index}`;
      const label =
        readString(option.label) ?? readString(option.name) ?? readString(option.value) ?? id;

      return {
        id,
        label,
        description: readString(option.description),
      };
    })
    .filter((option): option is NonNullable<typeof option> => Boolean(option));

  return normalized.length > 0 ? normalized : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function stringifyPayload(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.text === "string") return value.text;

  try {
    return JSON.stringify(value, null, 2) || fallback;
  } catch {
    return fallback;
  }
}
