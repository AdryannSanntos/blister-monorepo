import { z } from "zod";

const nodeTypeSchema = z.enum([
  "input",
  "output",
  "llm_generate",
  "image_generate",
  "condition",
  "brain_context",
  "context_retrieval",
  "transform",
  "review_gate",
]);

export const agentFlowNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeSchema,
  config: z.record(z.string(), z.unknown()).default({}),
});

export const agentFlowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

export const agentFlowDefinitionSchema = z.object({
  nodes: z
    .array(agentFlowNodeSchema)
    .min(2)
    .superRefine((nodes, ctx) => {
      if (!nodes.some((node) => node.type === "input")) {
        ctx.addIssue({
          code: "custom",
          message: "At least one input node is required",
        });
      }
      if (!nodes.some((node) => node.type === "output")) {
        ctx.addIssue({
          code: "custom",
          message: "At least one output node is required",
        });
      }
      for (const node of nodes) {
        if (
          node.type === "condition" &&
          typeof node.config.condition !== "string"
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Condition nodes require a condition config",
          });
        }
        if (
          node.type === "llm_generate" &&
          !(node.config.modelId || node.config.providerId)
        ) {
          ctx.addIssue({
            code: "custom",
            message: "LLM nodes require a model or provider preference",
          });
        }
        if (
          node.type === "image_generate" &&
          node.config.supportsImageGeneration === false
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Image nodes require image generation capability",
          });
        }
      }
    }),
  edges: z.array(agentFlowEdgeSchema).default([]),
});

export type AgentFlowNode = z.infer<typeof agentFlowNodeSchema>;
export type AgentFlowEdge = z.infer<typeof agentFlowEdgeSchema>;
export type AgentFlowDefinition = z.infer<typeof agentFlowDefinitionSchema>;
