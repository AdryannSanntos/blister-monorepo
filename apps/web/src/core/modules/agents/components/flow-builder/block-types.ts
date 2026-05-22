import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Brain,
  GitFork,
  ImageIcon,
  Library,
  type LucideIcon,
  MessageSquareText,
  ShieldCheck,
  Shuffle,
} from "lucide-react";

export type BlockType =
  | "input"
  | "output"
  | "llm_generate"
  | "image_generate"
  | "condition"
  | "brain_context"
  | "context_retrieval"
  | "transform"
  | "review_gate";

export type BlockMeta = {
  type: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  maxInstances?: number;
};

export const BLOCK_REGISTRY: BlockMeta[] = [
  {
    type: "input",
    label: "Entrada",
    description: "Ponto de entrada do fluxo",
    icon: ArrowDownToLine,
    color: "var(--accent)",
    maxInstances: 1,
  },
  {
    type: "llm_generate",
    label: "Gerar texto (LLM)",
    description: "Geração de texto via modelo de linguagem",
    icon: MessageSquareText,
    color: "#8b5cf6",
  },
  {
    type: "image_generate",
    label: "Gerar imagem",
    description: "Geração de imagem via modelo generativo",
    icon: ImageIcon,
    color: "#f59e0b",
  },
  {
    type: "brain_context",
    label: "Brain da empresa",
    description: "Consulta o brain do workspace",
    icon: Brain,
    color: "#06b6d4",
  },
  {
    type: "context_retrieval",
    label: "Buscar contexto",
    description: "Recupera contexto de fontes registradas",
    icon: Library,
    color: "#10b981",
  },
  {
    type: "condition",
    label: "Condição",
    description: "Ramificação condicional do fluxo",
    icon: GitFork,
    color: "#ec4899",
  },
  {
    type: "transform",
    label: "Transformar",
    description: "Transforma dados entre blocos",
    icon: Shuffle,
    color: "#64748b",
  },
  {
    type: "review_gate",
    label: "Revisão manual",
    description: "Pausa o fluxo para aprovação humana",
    icon: ShieldCheck,
    color: "#f97316",
  },
  {
    type: "output",
    label: "Saída",
    description: "Ponto de saída do fluxo",
    icon: ArrowUpFromLine,
    color: "#22c55e",
    maxInstances: 1,
  },
];

export function getBlockMeta(type: BlockType): BlockMeta {
  return BLOCK_REGISTRY.find((b) => b.type === type) ?? BLOCK_REGISTRY[0];
}
