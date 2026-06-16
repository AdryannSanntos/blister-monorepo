"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { MARKETPLACE_ITEMS } from "src/core/modules/blister-os/fixtures/marketplace-items.fixture";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import { simulateDelay } from "src/core/modules/blister-os/utils/simulate-delay";
import { BlisterStepper } from "src/core/shared/components/blister/blister-stepper";
import { FileDropzone } from "src/core/shared/components/blister/file-dropzone";
import { MarketplaceStyleThumb } from "src/core/shared/components/blister/marketplace-style-thumb";
import { Button } from "src/core/shared/components/ui/button";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { toast } from "src/core/shared/utils/blister-toast";

import { useRouter } from "@/i18n/routing";
import { getAgentHistoryPath } from "../../utils/agent-paths";

const STEPS = [
  { id: "upload", label: "Upload" },
  { id: "style", label: "Edit Style" },
  { id: "adjust", label: "Ajustes" },
  { id: "generate", label: "Geração" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export const VideoEditorGeneration = () => {
  const t = useTranslations("videoEditor");
  const router = useRouter();
  const owned = useBlisterOsStore((state) => state.owned);
  const editorStyleId = useBlisterOsStore((state) => state.editorStyleId);
  const setEditorStyleId = useBlisterOsStore((state) => state.setEditorStyleId);
  const addAgentRun = useBlisterOsStore((state) => state.addAgentRun);

  const [step, setStep] = useState<StepId>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const ownedStyles = MARKETPLACE_ITEMS.filter(
    (item) => item.type === "edit-style" && owned[item.id],
  );
  const selectedStyle =
    MARKETPLACE_ITEMS.find((item) => item.id === editorStyleId) ?? ownedStyles[0];

  const stepIndex = STEPS.findIndex((entry) => entry.id === step);

  const handleNext = async () => {
    if (step === "generate") return;
    if (step === "adjust") {
      setIsGenerating(true);
      await simulateDelay(1200);
      const output = t("resultMock", { style: selectedStyle?.name ?? "" });
      setResult(output);
      setIsGenerating(false);
      toast.success(t("generated"));
      addAgentRun({
        agentId: "video_editor",
        title: fileName ?? t("title"),
        status: "completed",
        reviewStatus: "pending",
        preview: output,
        creditsUsed: 2.4,
      });
      return;
    }
    setStep(STEPS[stepIndex + 1]?.id ?? step);
  };

  return (
    <div data-testid="video-editor-page" className="flex flex-col gap-6">
      <BlisterStepper steps={[...STEPS]} currentStepId={step} />

      {step === "upload" ? (
        <FileDropzone
          onFileSelect={(file) => {
            setFileName(file.name);
            toast.detail(t("fileSelectedTitle"), file.name);
          }}
        />
      ) : null}

      {step === "style" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ownedStyles.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-[var(--r-lg)] border p-2 text-left ${
                editorStyleId === item.id
                  ? "border-[var(--accent)] ring-2 ring-[var(--ring-focus)]"
                  : "border-[var(--line-default)]"
              }`}
              onClick={() => setEditorStyleId(item.id)}
            >
              <MarketplaceStyleThumb item={item} />
              <Paragraph className="mt-2 font-medium">{item.name}</Paragraph>
            </button>
          ))}
        </div>
      ) : null}

      {step === "adjust" ? (
        <Paragraph>{t("adjustCopy", { file: fileName ?? t("noFile") })}</Paragraph>
      ) : null}

      {step === "generate" || result ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-6">
          {isGenerating ? (
            <Paragraph>{t("generating")}</Paragraph>
          ) : (
            <Paragraph>{result ?? t("readyToGenerate")}</Paragraph>
          )}
        </div>
      ) : null}

      <div className="flex gap-2">
        {stepIndex > 0 && !result ? (
          <Button
            variant="outline"
            onClick={() => setStep(STEPS[stepIndex - 1]?.id ?? "upload")}
          >
            {t("back")}
          </Button>
        ) : null}
        {!result ? (
          <Button
            disabled={(step === "upload" && !fileName) || isGenerating}
            onClick={handleNext}
          >
            {step === "adjust" ? t("generate") : t("next")}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.push(getAgentHistoryPath("video-editor"))}
          >
            {t("viewHistory")}
          </Button>
        )}
      </div>
    </div>
  );
};
