"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
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
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { Link } from "@/i18n/routing";

const briefSchema = z.object({
  brief: z.string().min(8),
});

type BriefForm = z.infer<typeof briefSchema>;

type AgentSurfacePageProps = {
  agentSlug: string;
};

export const AgentSurfacePage = ({ agentSlug }: AgentSurfacePageProps) => {
  const t = useTranslations("agents.surface");
  const agent = getAgentByRouteSlug(agentSlug);
  const ownedAgentIds = useBlisterOsStore((state) => state.ownedAgentIds);
  const [output, setOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BriefForm>({
    resolver: zodResolver(briefSchema),
    mode: "onBlur",
    defaultValues: { brief: "" },
  });

  if (!agent) {
    return (
      <PageLayout icon={Sparkles} title={t("notFound")}>
        <Button asChild variant="outline">
          <Link href="/dashboard/marketplace">{t("goMarketplace")}</Link>
        </Button>
      </PageLayout>
    );
  }

  const needsEntitlement = agent.tier === "marketplace";
  const hasEntitlement = !needsEntitlement || ownedAgentIds.includes(agent.id);

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsLoading(true);
    await simulateDelay(900);
    setOutput(t("mockOutput", { agent: agent.name, brief: values.brief }));
    setIsLoading(false);
  });

  return (
    <div data-testid="agent-surface-page">
      <PageLayout icon={agent.icon} title={agent.name} description={agent.description}>
        {!hasEntitlement ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--warning-soft)] bg-[var(--warning-soft)] p-4">
            <Paragraph>{t("entitlementRequired")}</Paragraph>
            <Button className="mt-3" asChild>
              <Link href="/dashboard/marketplace">{t("redeemAgent")}</Link>
            </Button>
          </div>
        ) : (
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
        )}
        {output ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-4">
            <Paragraph>{output}</Paragraph>
          </div>
        ) : null}
      </PageLayout>
    </div>
  );
};
