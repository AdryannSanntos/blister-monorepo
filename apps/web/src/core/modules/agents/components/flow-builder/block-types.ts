import {
  Brain,
  Database,
  FileCode2,
  HardDrive,
  Image,
  ListChecks,
  type LucideIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export type BlockTypeKey =
  | "input"
  | "llm_generate"
  | "image_generate"
  | "question_form"
  | "html_validation"
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

export type BlockTypeDef = {
  key: BlockTypeKey;
  category: BlockCategoryKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  keywords: string[];
};

export const BLOCK_CATEGORIES: Record<BlockCategoryKey, BlockCategoryDef> = {
  essentials: {
    key: "essentials",
    label: "Base",
    description: "Blocos de entrada e entrega do fluxo.",
  },
  generation: {
    key: "generation",
    label: "Geração",
    description: "Transformações de IA para texto e imagem.",
  },
  interaction: {
    key: "interaction",
    label: "Interação",
    description: "Etapas que dependem de resposta ou contexto do usuário.",
  },
  validation: {
    key: "validation",
    label: "Validação",
    description: "Checagens antes da saída final.",
  },
};

export const BLOCK_TYPES: Record<BlockTypeKey, BlockTypeDef> = {
  input: {
    key: "input",
    category: "essentials",
    label: "Entrada",
    description: "Recebe a mensagem do usuário ou payload externo.",
    icon: Database,
    tone: "text-[var(--info)]",
    keywords: ["input", "entrada", "payload", "trigger"],
  },
  llm_generate: {
    key: "llm_generate",
    category: "generation",
    label: "Gerar com LLM",
    description: "Chama um modelo de linguagem para gerar texto.",
    icon: Sparkles,
    tone: "text-[var(--accent)]",
    keywords: ["llm", "texto", "prompt", "copy", "generation"],
  },
  image_generate: {
    key: "image_generate",
    category: "generation",
    label: "Gerar imagem",
    description: "Gera uma imagem a partir de prompt.",
    icon: Image,
    tone: "text-[var(--accent)]",
    keywords: ["imagem", "image", "creative", "visual"],
  },
  question_form: {
    key: "question_form",
    category: "interaction",
    label: "Perguntar ao usuário",
    description: "Coleta informações antes de continuar.",
    icon: ListChecks,
    tone: "text-[var(--warning)]",
    keywords: ["pergunta", "form", "input", "approval", "question"],
  },
  html_validation: {
    key: "html_validation",
    category: "validation",
    label: "Validar HTML",
    description: "Confere se o HTML gerado é válido antes de seguir.",
    icon: FileCode2,
    tone: "text-[var(--info)]",
    keywords: ["html", "validation", "preview", "qa"],
  },
  output: {
    key: "output",
    category: "essentials",
    label: "Saída",
    description: "Entrega o resultado final ao usuário.",
    icon: HardDrive,
    tone: "text-[var(--success)]",
    keywords: ["output", "saida", "delivery", "result"],
  },
};

export const STEP_ICONS: Record<string, LucideIcon> = {
  intent_classification: Brain,
  context_retrieval: Database,
  llm_call: Sparkles,
  html_validation: FileCode2,
  output_storage: HardDrive,
  attempt: RefreshCw,
};

export function getStepIcon(blockType: string): LucideIcon {
  return STEP_ICONS[blockType] ?? Sparkles;
}
