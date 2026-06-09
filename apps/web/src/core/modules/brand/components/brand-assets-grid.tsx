"use client";

import type { BrandAsset } from "@company-os/types";
import { Trash2, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { StorageImage } from "src/core/modules/brand/components/storage-image";
import {
  useAddBrandAsset,
  useRemoveBrandAsset,
} from "src/core/modules/brand/hooks/use-brand";
import { useUploadFile } from "src/core/modules/company/hooks/use-company";
import { Button } from "src/core/shared/components/ui/button";

type BrandAssetsGridProps = {
  assets: BrandAsset[];
};

export function BrandAssetsGrid({ assets }: BrandAssetsGridProps) {
  const t = useTranslations("brand.assetsSection");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { mutateAsync: uploadFile } = useUploadFile();
  const { mutateAsync: addAsset } = useAddBrandAsset();
  const { mutateAsync: removeAsset } = useRemoveBrandAsset();

  const handleUploadClick = () => {
    if (uploading) return;
    fileRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { key: storageKey } = await uploadFile({
        file,
        keyHint: `assets/${Date.now()}-${file.name}`,
      });
      await addAsset({
        storageKey,
        name: file.name,
        mimeType: file.type || undefined,
      });
      toast.success(t("uploadSuccess"));
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemove = async (assetId: string) => {
    setRemovingId(assetId);
    try {
      await removeAsset(assetId);
      toast.success(t("removeSuccess"));
    } catch {
      toast.error(t("removeError"));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleUploadClick}
        disabled={uploading}
        className="relative overflow-hidden rounded-[var(--r-lg)] border border-dashed border-[var(--line-strong)] bg-[var(--bg-sunken)] p-4 text-left transition-[border-color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] disabled:pointer-events-none disabled:opacity-45"
        aria-label={t("uploadAria")}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-base)] text-[var(--fg-tertiary)]">
            <UploadCloud className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--fg-primary)]">
              {uploading ? t("uploading") : t("uploadTitle")}
            </p>
            <p className="text-[12px] text-[var(--fg-tertiary)]">
              {t("uploadHint")}
            </p>
          </div>
        </div>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {assets.length === 0 ? (
        <p className="text-[13px] text-[var(--fg-tertiary)]">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-subtle)]"
            >
              <StorageImage
                storageKey={asset.storageKey}
                alt={asset.name}
                className="aspect-square w-full object-cover"
                fallbackClassName="aspect-square w-full"
              />
              <div className="flex items-center justify-between gap-2 border-t border-[var(--line-subtle)] px-3 py-2">
                <p className="truncate text-[12px] text-[var(--fg-secondary)]">
                  {asset.name}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("removeAria", { name: asset.name })}
                  disabled={removingId === asset.id}
                  onClick={() => handleRemove(asset.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
