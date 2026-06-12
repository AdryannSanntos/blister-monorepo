"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

const briefSchema = z.object({
  brief: z.string().min(10),
});

type BriefForm = z.infer<typeof briefSchema>;

export const ResearchPage = () => {
  const t = useTranslations("research");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BriefForm>({
    resolver: zodResolver(briefSchema),
    mode: "onBlur",
    defaultValues: { brief: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsLoading(true);
    await simulateDelay(800);
    setDeliverables([
      t("deliverable1"),
      t("deliverable2"),
      t("deliverable3", { topic: values.brief.slice(0, 40) }),
    ]);
    setIsLoading(false);
  });

  return (
    <div data-testid="research-page">
      <PageLayout icon={Sparkles} title={t("title")} description={t("description")}>
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

        {deliverables.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {deliverables.map((item) => (
              <li
                key={item}
                className="rounded-[var(--r-lg)] border border-[var(--line-default)] p-4"
              >
                <Paragraph>{item}</Paragraph>
              </li>
            ))}
          </ul>
        ) : null}
      </PageLayout>
    </div>
  );
};
