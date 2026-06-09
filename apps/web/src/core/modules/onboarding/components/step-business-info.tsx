"use client";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

import { useUploadFile } from "src/core/modules/company/hooks/use-company";
import { Button } from "src/core/shared/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../pages/onboarding-page";

export function StepBusinessInfo({ onNext }: { onNext: () => void }) {
  const t = useTranslations("onboarding.stepOne");
  const form = useFormContext<OnboardingFormValues>();
  const { mutateAsync: uploadFile } = useUploadFile();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { key: storageKey } = await uploadFile({
        file,
        keyHint: `logos/primary/${Date.now()}-${file.name}`,
      });
      form.setValue("logoStorageKey", storageKey);
      setLogoPreview(URL.createObjectURL(file));
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-sm text-[var(--fg-secondary)]">
          {t("subtitle")}
        </p>
      </div>

      <FormField
        control={form.control}
        name="companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("companyNameLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("companyNamePlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="niche"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("nicheLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("nichePlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("descriptionLabel")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("descriptionPlaceholder")}
                rows={3}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-col gap-2">
        <FormLabel>{t("logoLabel")}</FormLabel>
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoPreview}
            alt={t("logoAlt")}
            className="h-20 w-20 rounded-lg border border-[var(--border)] object-contain"
          />
        ) : (
          <div
            className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] text-xs text-[var(--fg-secondary)] transition-colors hover:border-[var(--accent)]"
            onClick={() => fileRef.current?.click()}
          >
            {t("logoUploadText")}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoChange}
        />
        {logoPreview && (
          <button
            type="button"
            className="w-fit text-xs text-[var(--fg-secondary)] underline"
            onClick={() => fileRef.current?.click()}
          >
            {t("logoChangeText")}
          </button>
        )}
      </div>

      <Button
        type="button"
        onClick={onNext}
        disabled={
          !form.watch("companyName") ||
          !form.watch("niche") ||
          !form.watch("description") ||
          uploading
        }
        className="w-full"
      >
        {uploading ? t("uploading") : t("nextButton")}
      </Button>
    </div>
  );
}
