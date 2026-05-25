import type { Edge, Node } from "@xyflow/react";
import type { BlockTypeKey } from "./block-types";

export type WorkflowNodeData = {
  blockType: BlockTypeKey;
  label?: string;
  prompt?: string;
  providerId?: string;
  modelId?: string;
  formTitle?: string;
  formGenerationInstructions?: string;
  formFields?: Array<{
    id: string;
    label: string;
    type:
      | "text"
      | "textarea"
      | "select"
      | "single_select"
      | "multi_select"
      | "number"
      | "boolean";
    required?: boolean;
    options?: string[];
  }>;
  targetAgentId?: string;
  validationMode?: "internal" | "human_review";
  outputBlocks?: Array<"text" | "markdown" | "list" | "card" | "image" | "cta">;
};

const DEFAULT_FORM_FIELDS: WorkflowNodeData["formFields"] = [
  {
    id: "campo_1",
    label: "Descreva o que você precisa",
    type: "textarea",
    required: true,
  },
];

export const buildNodeConfig = (node: Node<WorkflowNodeData>) => {
  const base: Record<string, unknown> = {
    label: node.data.label,
    position: node.position,
  };

  switch (node.data.blockType) {
    case "form":
      return {
        ...base,
        title: node.data.formTitle?.trim() || node.data.label?.trim() || "Formulário",
        generationInstructions:
          node.data.formGenerationInstructions?.trim() ||
          "Gere opções relevantes com base no contexto da empresa e do pedido.",
        fields:
          node.data.formFields && node.data.formFields.length > 0
            ? node.data.formFields
            : DEFAULT_FORM_FIELDS,
      };
    case "llm_call":
    case "clarification":
      return {
        ...base,
        prompt: node.data.prompt ?? "",
        ...(node.data.providerId ? { providerId: node.data.providerId } : {}),
        ...(node.data.modelId ? { modelId: node.data.modelId } : {}),
      };
    case "agent_call":
      return {
        ...base,
        ...(node.data.targetAgentId
          ? { targetAgentId: node.data.targetAgentId }
          : {}),
        inputTemplate: node.data.prompt ?? "",
      };
    case "validation":
      return {
        ...base,
        mode: node.data.validationMode ?? "internal",
        criteria: node.data.prompt ?? "",
      };
    case "output_formatter":
      return {
        ...base,
        outputBlocks: node.data.outputBlocks ?? ["markdown"],
      };
    case "decision":
    case "boolean":
      return {
        ...base,
        prompt: node.data.prompt ?? "",
      };
    case "input":
    case "output":
    case "if_else":
    case "finalizer":
    default:
      return base;
  }
};

export const serializeFlowEdges = (edges: Edge[]) =>
  edges.map((edge) => ({
    id:
      edge.id ||
      `${edge.source}-${edge.sourceHandle ?? "default"}-${edge.target}-${edge.targetHandle ?? "default"}`,
    sourceNodeId: edge.source,
    sourcePortKey: (edge.sourceHandle as string | null | undefined) ?? "default",
    targetNodeId: edge.target,
    targetPortKey: (edge.targetHandle as string | null | undefined) ?? "default",
  }));

export const serializeFlowNodes = (nodes: Node<WorkflowNodeData>[]) =>
  nodes.map((node) => ({
    id: node.id,
    type: node.data.blockType,
    config: buildNodeConfig(node),
  }));
