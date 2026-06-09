"use client";

import { Library, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Link } from "@/i18n/routing";
import { AGENT_UI_CONFIG, AGENT_UI_IDS } from "../config/agent-ui-config";
import { useCampaigns } from "../hooks/use-campaigns";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { Badge } from "src/core/shared/components/ui/badge";

const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  objective: z.string().trim().min(1).max(500),
  context: z.string().trim().max(2000).optional(),
});

type CreateCampaignValues = z.infer<typeof createCampaignSchema>;

export function CampaignsPage() {
  const t = useTranslations("agents.campaigns");
  const tAgents = useTranslations("agents");
  const { campaigns, createCampaign, deleteCampaign } = useCampaigns();
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<CreateCampaignValues>({
    resolver: zodResolver(createCampaignSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      objective: "",
      context: "",
    },
  });

  const handleCreate = form.handleSubmit(async (values) => {
    createCampaign(values);
    form.reset();
    setCreateOpen(false);
    toast.success(t("createSuccess"));
  });

  return (
    <PageLayout
      icon={Library}
      title={t("title")}
      description={t("description")}
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t("createButton")}
        </Button>
      }
    >
      {campaigns.length === 0 ? (
        <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <Library className="size-10 text-[var(--fg-quaternary)]" />
            <div>
              <p className="text-[16px] font-medium text-[var(--fg-primary)]">
                {t("emptyTitle")}
              </p>
              <p className="mt-2 max-w-md text-[14px] text-[var(--fg-tertiary)]">
                {t("emptyDescription")}
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t("createButton")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="border-[var(--line-default)] bg-[var(--bg-base)]"
            >
              <CardHeader className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
                      {campaign.name}
                    </CardTitle>
                    <p className="mt-2 text-[14px] text-[var(--fg-tertiary)]">
                      {campaign.objective}
                    </p>
                  </div>
                  <Badge variant="success">{t("activeBadge")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-6 pb-6 pt-0">
                {campaign.context ? (
                  <p className="text-[13px] leading-[1.55] text-[var(--fg-secondary)]">
                    {campaign.context}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {AGENT_UI_IDS.map((agentId) => {
                    const config = AGENT_UI_CONFIG[agentId];
                    const Icon = config.icon;
                    return (
                      <Button key={agentId} variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/agents/${agentId}?campaignId=${campaign.id}`}>
                          <Icon className="size-4" />
                          {tAgents(agentId)}
                        </Link>
                      </Button>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      deleteCampaign(campaign.id);
                      toast.success(t("deleteSuccess"));
                    }}
                  >
                    {t("deleteButton")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
            <DialogDescription>{t("createDialog.description")}</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("createDialog.nameLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("createDialog.namePlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("createDialog.objectiveLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("createDialog.objectivePlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="context"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("createDialog.contextLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder={t("createDialog.contextPlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  {t("createDialog.cancel")}
                </Button>
                <Button type="submit">{t("createDialog.submit")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
