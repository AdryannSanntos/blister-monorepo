import {
  Compass,
  Image,
  Package,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export type AgentUiId = "strategist" | "copywriter" | "designer" | "post";

export type AgentUiConfig = {
  id: AgentUiId;
  icon: LucideIcon;
  labelKey: AgentUiId;
  descriptionKey: `${AgentUiId}Description`;
  placeholderKey: `${AgentUiId}Placeholder`;
  suggestionKeys: readonly string[];
  estimatedCredits?: number;
};

export const AGENT_UI_IDS = [
  "strategist",
  "copywriter",
  "designer",
  "post",
] as const satisfies readonly AgentUiId[];

export const AGENT_UI_CONFIG: Record<AgentUiId, AgentUiConfig> = {
  strategist: {
    id: "strategist",
    icon: Compass,
    labelKey: "strategist",
    descriptionKey: "strategistDescription",
    placeholderKey: "strategistPlaceholder",
    suggestionKeys: [
      "strategistSuggestion1",
      "strategistSuggestion2",
      "strategistSuggestion3",
    ],
    estimatedCredits: 0.05,
  },
  copywriter: {
    id: "copywriter",
    icon: PenLine,
    labelKey: "copywriter",
    descriptionKey: "copywriterDescription",
    placeholderKey: "copywriterPlaceholder",
    suggestionKeys: [
      "copywriterSuggestion1",
      "copywriterSuggestion2",
      "copywriterSuggestion3",
    ],
    estimatedCredits: 0.03,
  },
  designer: {
    id: "designer",
    icon: Image,
    labelKey: "designer",
    descriptionKey: "designerDescription",
    placeholderKey: "designerPlaceholder",
    suggestionKeys: [
      "designerSuggestion1",
      "designerSuggestion2",
      "designerSuggestion3",
    ],
    estimatedCredits: 0.1,
  },
  post: {
    id: "post",
    icon: Package,
    labelKey: "post",
    descriptionKey: "postDescription",
    placeholderKey: "postPlaceholder",
    suggestionKeys: [
      "postSuggestion1",
      "postSuggestion2",
      "postSuggestion3",
    ],
    estimatedCredits: 0.22,
  },
};

export function isAgentUiId(value: string): value is AgentUiId {
  return AGENT_UI_IDS.includes(value as AgentUiId);
}

export function getAgentUiConfig(agentId: string): AgentUiConfig | null {
  if (!isAgentUiId(agentId)) return null;
  return AGENT_UI_CONFIG[agentId];
}
