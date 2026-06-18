import {
  parseCopywriterOutput,
  parseDesignerOutput,
  parsePostOutput,
  parseStrategistOutput,
  type StrategistTopic,
} from "./agent-run-helpers";

const priorityLabel: Record<
  NonNullable<StrategistTopic["priority"]>,
  string
> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const formatStrategistTopic = (
  topic: StrategistTopic,
  index: number,
): string => {
  const meta: string[] = [];
  if (topic.suggestedDate) meta.push(topic.suggestedDate);
  if (topic.platform) meta.push(topic.platform);
  if (topic.priority) meta.push(`Prioridade ${priorityLabel[topic.priority]}`);

  const header = `${index + 1}. **${topic.title}**`;
  const metaLine = meta.length > 0 ? `_${meta.join(" · ")}_` : "";
  return [header, metaLine, topic.description].filter(Boolean).join("\n");
};

export function formatAgentOutputMarkdown(
  agentId: string,
  payload: Record<string, unknown>,
): string {
  switch (agentId) {
    case "strategist": {
      const output = parseStrategistOutput(payload);
      const sections: string[] = [];

      if (output.recommendations) {
        sections.push(`**Recomendações**\n\n${output.recommendations}`);
      }

      if (output.topics?.length) {
        sections.push(
          `**Tópicos do plano**\n\n${output.topics
            .map((topic, index) => formatStrategistTopic(topic, index))
            .join("\n\n")}`,
        );
      }

      if (output.calendar) {
        const calendarLines = [
          `- Posts por semana: ${output.calendar.weeklyPosts}`,
          output.calendar.bestTimes?.length
            ? `- Melhores horários: ${output.calendar.bestTimes.join(", ")}`
            : null,
          output.calendar.platforms?.length
            ? `- Canais: ${output.calendar.platforms.join(", ")}`
            : null,
        ].filter(Boolean);

        sections.push(`**Calendário**\n\n${calendarLines.join("\n")}`);
      }

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
      if (output.tone) sections.push(`**Tom**\n\n${output.tone}`);
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
      if (output.imageUrl) {
        sections.push(`![Imagem gerada](${output.imageUrl})`);
      }
      if (output.prompt)
        sections.push(`**Briefing visual**\n\n${output.prompt}`);
      if (output.style) sections.push(`**Estilo:** ${output.style}`);
      if (output.colors?.length) {
        sections.push(`**Cores:** ${output.colors.join(", ")}`);
      }
      if (output.width && output.height) {
        sections.push(`**Dimensões:** ${output.width}×${output.height}px`);
      }
      const storageKey = output.storageKey ?? output.imageStorageKey;
      if (storageKey) {
        sections.push(`**Arquivo:** \`${storageKey}\``);
      }
      return sections.join("\n\n") || "_Imagem gerada._";
    }
    case "post": {
      const output = parsePostOutput(payload);
      const sections: string[] = [];

      const specParts: string[] = [];
      if (output.platform) specParts.push(output.platform);
      if (output.format) {
        specParts.push(
          output.format === "carousel" ? "Carrossel" : "Imagem única",
        );
      }
      if (output.slides?.length)
        specParts.push(`${output.slides.length} slide(s)`);
      if (output.width && output.height) {
        specParts.push(`${output.width}×${output.height}px`);
      }
      if (specParts.length)
        sections.push(`**Post**\n\n${specParts.join(" · ")}`);

      if (output.caption) sections.push(`**Legenda**\n\n${output.caption}`);
      if (output.hashtags?.length) {
        sections.push(
          `**Hashtags**\n\n${output.hashtags
            .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
            .join(" ")}`,
        );
      }

      return sections.join("\n\n") || "_Post gerado._";
    }
    default:
      return "_Sem conteúdo gerado._";
  }
}
