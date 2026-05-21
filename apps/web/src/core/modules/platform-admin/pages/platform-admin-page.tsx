"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { PageLayout } from "src/core/shared/components/ui/page-layout";

const sections = [
  "Admins",
  "Providers",
  "Models",
  "Policies",
  "Templates",
  "Runs",
  "Costs",
];

export function PlatformAdminPage() {
  return (
    <PageLayout
      eyebrow="Conta"
      title="Admin de plataforma"
      description="Governança global de providers, modelos, políticas operacionais, execuções e custos do Workana AI."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Card
            key={section}
            className="border-[var(--line-default)] bg-[var(--bg-base)]"
          >
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
                {section}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 text-[13px] text-[var(--fg-tertiary)]">
              Área dedicada para observabilidade e configuração global de{" "}
              {section.toLowerCase()}.
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
