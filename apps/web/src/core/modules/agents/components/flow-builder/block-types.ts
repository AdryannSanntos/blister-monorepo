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

export type BlockTypeDef = {
  key: BlockTypeKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

export const BLOCK_TYPES: Record<BlockTypeKey, BlockTypeDef> = {
  input: {
    key: "input",
    label: "Entrada",
    description: "Recebe a mensagem do usuário ou payload externo.",
    icon: Database,
    tone: "text-[var(--info)]",
  },
  llm_generate: {
    key: "llm_generate",
    label: "Gerar com LLM",
    description: "Chama um modelo de linguagem para gerar texto.",
    icon: Sparkles,
    tone: "text-[var(--accent)]",
  },
  image_generate: {
    key: "image_generate",
    label: "Gerar imagem",
    description: "Gera uma imagem a partir de prompt.",
    icon: Image,
    tone: "text-[var(--accent)]",
  },
  question_form: {
    key: "question_form",
    label: "Perguntar ao usuário",
    description: "Coleta informações antes de continuar.",
    icon: ListChecks,
    tone: "text-[var(--warning)]",
  },
  html_validation: {
    key: "html_validation",
    label: "Validar HTML",
    description: "Confere se o HTML gerado é válido antes de seguir.",
    icon: FileCode2,
    tone: "text-[var(--info)]",
  },
  output: {
    key: "output",
    label: "Saída",
    description: "Entrega o resultado final ao usuário.",
    icon: HardDrive,
    tone: "text-[var(--success)]",
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
