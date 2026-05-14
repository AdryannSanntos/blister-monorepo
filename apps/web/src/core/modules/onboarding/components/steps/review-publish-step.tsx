"use client";

import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";

const SECTION_LABELS: Record<string, string> = {
  "company-basics": "Dados básicos",
  positioning: "Posicionamento",
  "products-services": "Produtos e serviços",
  "target-audience": "Público-alvo",
  "tone-of-voice": "Tom de voz",
  "differentials-faq": "Diferenciais e FAQ",
  "processes-rules": "Processos e regras",
};

const FIELD_LABELS: Record<string, string> = {
  companyName: "Nome da empresa",
  industry: "Segmento",
  description: "Descrição",
  website: "Website",
  mission: "Missão",
  vision: "Visão",
  valueProposition: "Proposta de valor",
  products: "Produtos/Serviços",
  pricing: "Precificação",
  idealCustomer: "Cliente ideal",
  painPoints: "Dores",
  channels: "Canais",
  tone: "Tom de voz",
  communicationStyle: "Estilo de comunicação",
  avoidWords: "Palavras a evitar",
  differentials: "Diferenciais",
  faq: "FAQ",
  processes: "Processos",
  rules: "Regras",
  tools: "Ferramentas",
};

type Props = {
  data: Record<string, unknown>;
};

export function ReviewPublishStep({ data }: Props) {
  const sections = Object.entries(data).filter(
    ([key]) => key !== "welcome" && key !== "review-publish",
  );

  return (
    <div className="space-y-6">
      <CardHeader className="px-0 text-center">
        <CardTitle>Revisão final</CardTitle>
        <CardDescription>
          Confira as informações antes de publicar o Company Brain.
        </CardDescription>
      </CardHeader>

      {sections.length === 0 ? (
        <p className="text-center text-sm text-[var(--fg-tertiary)]">
          Nenhuma informação preenchida ainda. Volte às etapas anteriores.
        </p>
      ) : (
        sections.map(([sectionKey, sectionData]) => (
          <div key={sectionKey} className="space-y-2">
            <h4 className="font-medium text-[var(--fg-primary)]">
              {SECTION_LABELS[sectionKey] ?? sectionKey}
            </h4>
            <div className="space-y-1 rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
              {Object.entries(sectionData as Record<string, string>).map(
                ([fieldKey, value]) =>
                  value ? (
                    <div key={fieldKey} className="text-sm">
                      <span className="font-medium text-[var(--fg-secondary)]">
                        {FIELD_LABELS[fieldKey] ?? fieldKey}:
                      </span>{" "}
                      <span className="text-[var(--fg-primary)]">{value}</span>
                    </div>
                  ) : null,
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
