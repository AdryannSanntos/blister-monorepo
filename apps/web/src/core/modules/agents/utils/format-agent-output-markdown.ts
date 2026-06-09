import type { AgentUiId } from "../config/agent-ui-config";
import {
  parseCopywriterOutput,
  parseDesignerOutput,
  parsePostOutput,
  parseStrategistOutput,
} from "./agent-run-helpers";

export function formatAgentOutputMarkdown(
  agentId: AgentUiId,
  payload: Record<string, unknown>,
): string {
  switch (agentId) {
    case "strategist": {
      const output = parseStrategistOutput(payload);
      const sections: string[] = [];
      if (output.summary) sections.push(`**Resumo**\n\n${output.summary}`);
      if (output.plan) sections.push(`**Plano**\n\n${output.plan}`);
      if (output.angles?.length) {
        sections.push(
          `**Ângulos**\n\n${output.angles.map((angle) => `- ${angle}`).join("\n")}`,
        );
      }
      if (output.suggestedCalendar?.length) {
        sections.push(
          `**Calendário sugerido**\n\n${output.suggestedCalendar
            .map((item) => `- ${item.date}: ${item.topic} (${item.format})`)
            .join("\n")}`,
        );
      }
      return sections.join("\n\n") || "_Sem conteúdo gerado._";
    }
    case "copywriter": {
      const output = parseCopywriterOutput(payload);
      const sections: string[] = [];
      if (output.caption) sections.push(`**Legenda**\n\n${output.caption}`);
      if (output.hashtags?.length) {
        sections.push(
          `**Hashtags**\n\n${output.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ")}`,
        );
      }
      if (output.callToAction) {
        sections.push(`**CTA**\n\n${output.callToAction}`);
      }
      if (output.variations?.length) {
        sections.push(
          `**Variações**\n\n${output.variations
            .map((variation) => `_${variation.tone}_\n${variation.caption}`)
            .join("\n\n")}`,
        );
      }
      return sections.join("\n\n") || "_Sem conteúdo gerado._";
    }
    case "designer": {
      const output = parseDesignerOutput(payload);
      const sections: string[] = [];
      if (output.prompt) sections.push(`**Briefing visual**\n\n${output.prompt}`);
      if (output.width && output.height) {
        sections.push(`**Dimensões:** ${output.width}×${output.height}px`);
      }
      if (output.imageStorageKey) {
        sections.push(`**Arquivo:** \`${output.imageStorageKey}\``);
      }
      return sections.join("\n\n") || "_Imagem gerada._";
    }
    case "post": {
      const output = parsePostOutput(payload);
      return formatAgentOutputMarkdown("copywriter", payload).concat(
        "\n\n---\n\n",
        formatAgentOutputMarkdown("designer", payload),
      );
    }
    default:
      return "_Sem conteúdo gerado._";
  }
}
