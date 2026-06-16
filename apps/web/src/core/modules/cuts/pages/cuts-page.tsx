"use client";

import { Scissors } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { MARKETPLACE_ITEMS } from "src/core/modules/blister-os/fixtures/marketplace-items.fixture";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import { simulateDelay } from "src/core/modules/blister-os/utils/simulate-delay";
import { FileDropzone } from "src/core/shared/components/blister/file-dropzone";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { toast } from "src/core/shared/utils/blister-toast";

type CutResult = { id: string; title: string; score: number };

export const CutsPage = () => {
  const t = useTranslations("cuts");
  const owned = useBlisterOsStore((state) => state.owned);
  const [fileName, setFileName] = useState<string | null>(null);
  const [styleId, setStyleId] = useState("es-corte-seco");
  const [cuts, setCuts] = useState<CutResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const ownedStyles = MARKETPLACE_ITEMS.filter(
    (item) => item.type === "edit-style" && owned[item.id],
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    await simulateDelay(1000);
    setCuts([
      { id: "c1", title: "Gancho — pergunta polêmica", score: 92 },
      { id: "c2", title: "Prova social — depoimento", score: 88 },
      { id: "c3", title: "CTA — última chance", score: 81 },
    ]);
    setIsGenerating(false);
    toast.success(t("generated"));
  };

  return (
    <div data-testid="cuts-page">
      <PageLayout icon={Scissors} title={t("title")} description={t("description")}>
        <FileDropzone
          onFileSelect={(file) => {
            setFileName(file.name);
            toast.detail(t("fileSelectedTitle"), file.name);
          }}
        />

        <div className="flex flex-col gap-2">
          <Paragraph className="font-medium">{t("styleLabel")}</Paragraph>
          <div className="flex flex-wrap gap-2">
            {ownedStyles.map((style) => (
              <Button
                key={style.id}
                variant={styleId === style.id ? "default" : "outline"}
                size="sm"
                onClick={() => setStyleId(style.id)}
              >
                {style.name}
              </Button>
            ))}
          </div>
        </div>

        <Button disabled={!fileName || isGenerating} onClick={handleGenerate}>
          {isGenerating ? t("generating") : t("generate")}
        </Button>

        {cuts.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {cuts.map((cut) => (
              <li
                key={cut.id}
                className="flex items-center justify-between rounded-[var(--r-lg)] border border-[var(--line-default)] p-4"
              >
                <Paragraph className="font-medium">{cut.title}</Paragraph>
                <Paragraph size="p5" tone="tertiary">
                  {t("score", { value: cut.score })}
                </Paragraph>
              </li>
            ))}
          </ul>
        ) : null}
      </PageLayout>
    </div>
  );
};
