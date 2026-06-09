"use client";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";

import { Button } from "src/core/shared/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../pages/onboarding-page";

export function StepBrandVoice({
  onBack,
  submitting,
}: {
  onBack: () => void;
  submitting: boolean;
}) {
  const t = useTranslations("onboarding.stepTwo");
  const form = useFormContext<OnboardingFormValues>();

  const voiceExamples = [
    t("example1"),
    t("example2"),
    t("example3"),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-sm text-[var(--fg-secondary)]">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-[var(--fg-secondary)]">{t("examplesLabel")}</p>
        <div className="flex flex-col gap-1">
          {voiceExamples.map((example) => (
            <button
              key={example}
              type="button"
              className="rounded border border-[var(--border)] px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--bg-subtle)]"
              onClick={() => form.setValue("brandVoice", example)}
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      <FormField
        control={form.control}
        name="brandVoice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("label")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("placeholder")}
                rows={4}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={submitting}
        >
          {t("backButton")}
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!form.watch("brandVoice") || submitting}
        >
          {submitting ? t("submitting") : t("submitButton")}
        </Button>
      </div>
    </div>
  );
}
