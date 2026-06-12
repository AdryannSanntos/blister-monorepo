"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { AgentCatalogEntry } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import { simulateDelay } from "src/core/modules/blister-os/utils/simulate-delay";
import { Button } from "src/core/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Textarea } from "src/core/shared/components/ui/textarea";

import { useRouter } from "@/i18n/routing";
import { getAgentHistoryPath } from "../../utils/agent-paths";

const briefSchema = z.object({
  brief: z.string().min(8),
});

type BriefForm = z.infer<typeof briefSchema>;

type BriefAgentGenerationProps = {
  agent: AgentCatalogEntry;
};

export const BriefAgentGeneration = ({ agent }: BriefAgentGenerationProps) => {
  const t = useTranslations("agents.surface");
  const router = useRouter();
  const addAgentRun = useBlisterOsStore((state) => state.addAgentRun);
  const [output, setOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BriefForm>({
    resolver: zodResolver(briefSchema),
    mode: "onBlur",
    defaultValues: { brief: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsLoading(true);
    await simulateDelay(900);
    const nextOutput = t("mockOutput", { agent: agent.name, brief: values.brief });
    setOutput(nextOutput);
    setIsLoading(false);
    addAgentRun({
      agentId: agent.id,
      title: values.brief.slice(0, 80),
      status: "completed",
      reviewStatus: "pending",
      preview: nextOutput,
      creditsUsed: 0.5,
    });
  });

  return (
    <div data-testid="agent-surface-page" className="flex flex-col gap-6">
      <Form {...form}>
        <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
          <FormField
            control={form.control}
            name="brief"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("briefLabel")}</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder={t("briefPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("running") : t("run")}
          </Button>
        </form>
      </Form>

      {output ? (
        <>
          <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-4">
            <Paragraph>{output}</Paragraph>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(getAgentHistoryPath(agent.routeSlug))}
          >
            {t("viewHistory")}
          </Button>
        </>
      ) : null}
    </div>
  );
};
