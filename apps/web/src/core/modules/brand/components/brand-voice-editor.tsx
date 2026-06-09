"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useUpdateBrand } from "src/core/modules/brand/hooks/use-brand";
import { Button } from "src/core/shared/components/ui/button";
import { Textarea } from "src/core/shared/components/ui/textarea";

export function BrandVoiceEditor({ initial }: { initial: string }) {
  const t = useTranslations("brand.voice");
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const { mutateAsync: update, isPending } = useUpdateBrand();

  async function handleSave() {
    try {
      await update({ brandVoice: value });
      toast.success(t("successMessage"));
      setDirty(false);
    } catch {
      toast.error(t("errorMessage"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        rows={5}
        placeholder={t("placeholder")}
        className="resize-none"
      />
      {dirty && (
        <Button onClick={handleSave} disabled={isPending} className="w-fit">
          {isPending ? t("saving") : t("saveButton")}
        </Button>
      )}
    </div>
  );
}
