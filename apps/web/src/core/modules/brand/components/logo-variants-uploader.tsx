"use client";

import type { LogoVariant, LogoVariants } from "@company-os/types";
import { logoVariantValues } from "@company-os/types";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { StorageImage } from "src/core/modules/brand/components/storage-image";
import { useUpdateLogo } from "src/core/modules/brand/hooks/use-brand";
import { useUploadFile } from "src/core/modules/company/hooks/use-company";

type LogoVariantsUploaderProps = {
  logoVariants: LogoVariants;
};

export function LogoVariantsUploader({ logoVariants }: LogoVariantsUploaderProps) {
  const t = useTranslations("brand.logo");
  const [uploadingVariant, setUploadingVariant] = useState<LogoVariant | null>(
    null,
  );
  const [localPreviews, setLocalPreviews] = useState<
    Partial<Record<LogoVariant, string>>
  >({});
  const fileRefs = useRef<Partial<Record<LogoVariant, HTMLInputElement>>>({});
  const { mutateAsync: uploadFile } = useUploadFile();
  const { mutateAsync: updateLogo } = useUpdateLogo();

  const handleFileChange = async (
    variant: LogoVariant,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingVariant(variant);
    try {
      const { key: storageKey } = await uploadFile({
        file,
        keyHint: `logos/${variant}/${Date.now()}-${file.name}`,
      });
      await updateLogo({ variant, logoStorageKey: storageKey });
      setLocalPreviews((current) => ({
        ...current,
        [variant]: URL.createObjectURL(file),
      }));
      toast.success(t("successMessage"));
    } catch {
      toast.error(t("errorMessage"));
    } finally {
      setUploadingVariant(null);
      event.target.value = "";
    }
  };

  const handleOpenPicker = (variant: LogoVariant) => {
    if (uploadingVariant) return;
    fileRefs.current[variant]?.click();
  };

  const handleKeyDown = (
    variant: LogoVariant,
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenPicker(variant);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {logoVariantValues.map((variant) => {
        const storageKey = logoVariants[variant] ?? null;
        const localPreview = localPreviews[variant];
        const isUploading = uploadingVariant === variant;

        return (
          <div key={variant} className="flex flex-col gap-2">
            <p className="text-[12px] font-medium text-[var(--fg-secondary)]">
              {t(`variants.${variant}`)}
            </p>
            <div
              role="button"
              tabIndex={0}
              aria-label={t("uploadAria", { variant: t(`variants.${variant}`) })}
              className="relative h-24 w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-subtle)] transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              onClick={() => handleOpenPicker(variant)}
              onKeyDown={(event) => handleKeyDown(variant, event)}
            >
              {localPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={localPreview}
                  alt={t("alt")}
                  className="h-full w-full rounded-xl object-contain p-1"
                />
              ) : (
                <StorageImage
                  storageKey={storageKey}
                  alt={t("alt")}
                  className="h-full w-full rounded-xl object-contain p-1"
                  fallbackClassName="h-full w-full"
                />
              )}
              {!localPreview && !storageKey ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[var(--fg-secondary)]">
                  {t("uploadText")}
                </div>
              ) : null}
              <div className="absolute -bottom-1 -right-1 rounded-full bg-[var(--accent)] p-1">
                <Pencil className="h-3 w-3 text-white" />
              </div>
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : null}
            </div>
            <input
              ref={(node) => {
                fileRefs.current[variant] = node ?? undefined;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleFileChange(variant, event)}
            />
          </div>
        );
      })}
      <p className="col-span-full text-xs text-[var(--fg-secondary)]">
        {t("formatHint")}
      </p>
    </div>
  );
}
