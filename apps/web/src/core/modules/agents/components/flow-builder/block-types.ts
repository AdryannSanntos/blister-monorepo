import {
  ArrowRightLeft,
  Brain,
  CheckCircle,
  Database,
  GitBranch,
  HardDrive,
  ListChecks,
  MessageSquare,
  type LucideIcon,
  RefreshCw,
  LayoutTemplate,
  Sparkles,
  Users,
  X,
} from "lucide-react";

// Phase 1 block types (V2 graph-aware)
export type BlockTypeKey =
  | "input"
  | "decision"
  | "boolean"
  | "if_else"
  | "llm_call"
  | "agent_call"
  | "clarification"
  | "form"
  | "validation"
  | "output_formatter"
  | "finalizer"
  | "output";

export type BlockCategoryKey =
  | "essentials"
  | "generation"
  | "interaction"
  | "validation";

export type BlockCategoryDef = {
  key: BlockCategoryKey;
  label: string;
  description: string;
};

export type BlockPort = {
  id: string;
  label: string;
  side: "source" | "target";
};

export type BlockTypeDef = {
  key: BlockTypeKey;
  category: BlockCategoryKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  keywords: string[];
  sourcePorts: BlockPort[];
  targetPorts: BlockPort[];
};

export const BLOCK_CATEGORIES: Record<BlockCategoryKey, BlockCategoryDef> = {
  essentials: {
    key: "essentials",
    label: "Base",
    description: "Blocos de entrada, desvio e entrega do fluxo.",
  },
  generation: {
    key: "generation",
    label: "Geração",
    description: "Chamadas a modelos de linguagem e sub-agentes.",
  },
  interaction: {
    key: "interaction",
    label: "Interação",
    description: "Etapas que dependem de resposta ou contexto do usuário.",
  },
  validation: {
    key: "validation",
    label: "Validação",
    description: "Checagens e formatação antes da entrega final.",
  },
};

export const BLOCK_TYPES: Record<BlockTypeKey, BlockTypeDef> = {
  input: {
    key: "input",
    category: "essentials",
    label: "Entrada",
    description: "Ponto de entrada do fluxo. Recebe a mensagem ou payload.",
    icon: Database,
    tone: "text-[var(--info)]",
    keywords: ["input", "entrada", "payload", "trigger"],
    sourcePorts: [{ id: "default", label: "Saída", side: "source" }],
    targetPorts: [],
  },
  decision: {
    key: "decision",
    category: "essentials",
    label: "Decisão",
    description: "Classifica a intenção e roteia para ramos diferentes.",
    icon: GitBranch,
    tone: "text-[var(--accent)]",
    keywords: ["decision", "intent", "rota", "branch", "classify"],
    sourcePorts: [
      { id: "execution", label: "Execução", side: "source" },
      { id: "context", label: "Contexto", side: "source" },
      { id: "fallback", label: "Fallback", side: "source" },
    ],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  boolean: {
    key: "boolean",
    category: "essentials",
    label: "Condição booleana",
    description: "Avalia uma expressão e bifurca em verdadeiro/falso.",
    icon: ArrowRightLeft,
    tone: "text-[var(--warning)]",
    keywords: ["boolean", "condition", "if", "verdadeiro", "falso"],
    sourcePorts: [
      { id: "true", label: "Verdadeiro", side: "source" },
      { id: "false", label: "Falso", side: "source" },
    ],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  if_else: {
    key: "if_else",
    category: "essentials",
    label: "If / Else",
    description: "Bifurca o fluxo em múltiplos ramos com base em condições.",
    icon: GitBranch,
    tone: "text-[var(--warning)]",
    keywords: ["if", "else", "branch", "conditional", "ramo"],
    sourcePorts: [
      { id: "branch_a", label: "Ramo A", side: "source" },
      { id: "branch_b", label: "Ramo B", side: "source" },
      { id: "default", label: "Padrão", side: "source" },
    ],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  llm_call: {
    key: "llm_call",
    category: "generation",
    label: "Chamada LLM",
    description: "Executa um prompt em um modelo de linguagem.",
    icon: Sparkles,
    tone: "text-[var(--accent)]",
    keywords: ["llm", "texto", "prompt", "copy", "generation", "ai"],
    sourcePorts: [{ id: "default", label: "Resultado", side: "source" }],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  agent_call: {
    key: "agent_call",
    category: "generation",
    label: "Chamar sub-agente",
    description: "Delega uma tarefa para outro agente e aguarda o resultado.",
    icon: Users,
    tone: "text-[var(--accent)]",
    keywords: ["agent", "subagent", "delegate", "call", "recurse"],
    sourcePorts: [
      { id: "result", label: "Resultado", side: "source" },
      { id: "childRunId", label: "Run ID filho", side: "source" },
    ],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  clarification: {
    key: "clarification",
    category: "interaction",
    label: "Clarificação",
    description: "Pausa e pede ao usuário que esclareça a solicitação.",
    icon: MessageSquare,
    tone: "text-[var(--warning)]",
    keywords: ["clarification", "pergunta", "esclarecer", "pause", "suspend"],
    sourcePorts: [{ id: "default", label: "Resposta", side: "source" }],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  form: {
    key: "form",
    category: "interaction",
    label: "Formulário",
    description: "Coleta dados estruturados do usuário via campos dinâmicos.",
    icon: ListChecks,
    tone: "text-[var(--warning)]",
    keywords: ["form", "campos", "coleta", "input", "question", "structured"],
    sourcePorts: [{ id: "answers", label: "Respostas", side: "source" }],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  validation: {
    key: "validation",
    category: "validation",
    label: "Validação",
    description: "Solicita aprovação humana antes de continuar o fluxo.",
    icon: CheckCircle,
    tone: "text-[var(--info)]",
    keywords: ["validation", "approval", "review", "qa", "human", "check"],
    sourcePorts: [
      { id: "approved", label: "Aprovado", side: "source" },
      { id: "rejected", label: "Rejeitado", side: "source" },
    ],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  output_formatter: {
    key: "output_formatter",
    category: "validation",
    label: "Formatar saída",
    description: "Estrutura o resultado como blocos UI tipados.",
    icon: LayoutTemplate,
    tone: "text-[var(--success)]",
    keywords: ["output", "format", "ui", "render", "blocks", "template"],
    sourcePorts: [{ id: "ui_output", label: "UI Output", side: "source" }],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  finalizer: {
    key: "finalizer",
    category: "essentials",
    label: "Finalizador",
    description: "Conclui a execução e emite o resultado final da run.",
    icon: HardDrive,
    tone: "text-[var(--success)]",
    keywords: ["finalizer", "end", "conclude", "finish", "result"],
    sourcePorts: [],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
  output: {
    key: "output",
    category: "essentials",
    label: "Saída",
    description: "Entrega o resultado final ao usuário.",
    icon: HardDrive,
    tone: "text-[var(--success)]",
    keywords: ["output", "saida", "delivery", "result"],
    sourcePorts: [],
    targetPorts: [{ id: "default", label: "Entrada", side: "target" }],
  },
};

export const STEP_ICONS: Record<string, LucideIcon> = {
  intent_classification: Brain,
  context_retrieval: Database,
  llm_generate: Sparkles,
  llm_call: Sparkles,
  agent_call: Users,
  clarification: MessageSquare,
  form: ListChecks,
  validation: CheckCircle,
  output_formatter: LayoutTemplate,
  finalizer: HardDrive,
  output_storage: HardDrive,
  decision: GitBranch,
  boolean: ArrowRightLeft,
  if_else: GitBranch,
  run_error: X,
  attempt: RefreshCw,
};

export function getStepIcon(blockType: string): LucideIcon {
  return STEP_ICONS[blockType] ?? Sparkles;
}
