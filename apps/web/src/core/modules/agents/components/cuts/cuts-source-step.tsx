"use client";

import { MAX_PRESIGNED_UPLOAD_BYTES } from "@company-os/types";
import { ChevronDown, Clapperboard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "src/core/shared/utils/blister-toast";

import type { CutsLocalRunOptions } from "src/core/modules/agents/hooks/use-cuts-run-modal";
import { useSourceVideoDuration } from "src/core/modules/agents/hooks/use-source-video-duration";
import { FilesPickerModal } from "src/core/modules/files/components/files-picker-modal";
import { isVideoFileForCuts } from "src/core/modules/files/utils/files-picker-rules";
import { FileUploadPicker } from "src/core/shared/components/blister/file-upload-picker";
import { Button } from "src/core/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/core/shared/components/ui/collapsible";
import { DialogFooter } from "src/core/shared/components/ui/dialog";
import { Label } from "src/core/shared/components/ui/label";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Slider } from "src/core/shared/components/ui/slider";
import { cn } from "src/core/shared/utils";

const VIDEO_GENRES = [
  "podcast",
  "live",
  "tutorial",
  "interview",
  "vlog",
  "storytelling",
  "other",
] as const;

const MODEL_TIERS = ["basic", "auto", "pro"] as const;

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

type CutsSourceStepProps = {
  localFile: File | null;
  existingFileName: string | null;
  existingFileSize: string | null;
  hasSource: boolean;
  isSubmitting?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  previewUrl?: string | null;
  runOptions: CutsLocalRunOptions;
  onLocalFileChange: (file: File | null) => void;
  onSelectExistingFile: (fileId: string, fileName: string, fileSize: string) => void;
  onRunOptionsChange: (patch: Partial<CutsLocalRunOptions>) => void;
  onStartRun: () => Promise<void>;
};

export const CutsSourceStep = ({
  localFile,
  existingFileName,
  existingFileSize,
  hasSource,
  isSubmitting = false,
  isUploading = false,
  uploadProgress = 0,
  previewUrl = null,
  runOptions,
  onLocalFileChange,
  onSelectExistingFile,
  onRunOptionsChange,
  onStartRun,
}: CutsSourceStepProps) => {
  const t = useTranslations("cuts.modal");
  const tOptions = useTranslations("cuts.modal.options");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Only extract duration for local files via blob URL.
  // Passing a presigned S3 URL here triggers many browser range requests on large remote videos.
  const { durationSec, isLoading: isLoadingDuration } = useSourceVideoDuration({
    localFile,
    previewUrl: null,
  });

  const maxSec = useMemo(
    () => (durationSec ? Math.max(Math.floor(durationSec), 1) : 600),
    [durationSec],
  );

  const timeframe = useMemo(
    () =>
      runOptions.processingTimeframe ?? {
        startSec: 0,
        endSec: maxSec,
      },
    [runOptions.processingTimeframe, maxSec],
  );

  const sliderValue = useMemo(
    () => [timeframe.startSec, Math.min(timeframe.endSec, maxSec)],
    [timeframe.startSec, timeframe.endSec, maxSec],
  );

  const handleReject = useCallback(() => {
    toast.error(t("fileTooLarge"));
  }, [t]);

  const handleSelectExisting = useCallback(
    (fileId: string, fileName: string, fileSize: string) => {
      onSelectExistingFile(fileId, fileName, fileSize);
      toast.detail(t("fileSelectedTitle"), fileName);
    },
    [onSelectExistingFile, t],
  );

  const handleTimeframeChange = useCallback(
    (values: number[]) => {
      const [startSec, endSec] = values;
      if (endSec <= startSec) return;
      onRunOptionsChange({ processingTimeframe: { startSec, endSec } });
    },
    [onRunOptionsChange],
  );

  const showExistingSelection = Boolean(existingFileName) && !localFile;

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4" data-testid="cuts-source-step">
        <FileUploadPicker
          value={localFile}
          onChange={onLocalFileChange}
          accept="video/*,audio/*"
          maxBytes={MAX_PRESIGNED_UPLOAD_BYTES}
          onReject={handleReject}
        />

        <Paragraph size="p6" tone="tertiary">
          {t("uploadOnGenerateHint")}
        </Paragraph>

        <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
          {t("browseFiles")}
        </Button>

        {showExistingSelection ? (
          <div
            className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3"
            data-testid="cuts-existing-file-selection"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]">
              <Clapperboard className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <Paragraph className="truncate font-medium">{existingFileName}</Paragraph>
              {existingFileSize ? (
                <Paragraph size="p6" tone="tertiary" className="mt-0.5">
                  {existingFileSize}
                </Paragraph>
              ) : null}
            </div>
          </div>
        ) : null}

        {hasSource ? (
          <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex w-full items-center justify-between px-1"
                data-testid="cuts-options-trigger"
              >
                <span>{tOptions("title")}</span>
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    optionsOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cuts-model-tier">{tOptions("modelTierLabel")}</Label>
                <Select
                  value={runOptions.modelTier}
                  onValueChange={() => onRunOptionsChange({ modelTier: "basic" })}
                >
                  <SelectTrigger id="cuts-model-tier" data-testid="cuts-model-tier-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_TIERS.map((tier) => {
                      const enabled = tier === "basic";
                      return (
                        <SelectItem
                          key={tier}
                          value={tier}
                          disabled={!enabled}
                        >
                          {tOptions(`modelTier.${tier}`)}
                          {!enabled ? ` (${tOptions("comingSoon")})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cuts-video-genre">{tOptions("genreLabel")}</Label>
                <Select
                  value={runOptions.videoGenre ?? "none"}
                  onValueChange={(value) =>
                    onRunOptionsChange({
                      videoGenre:
                        value === "none"
                          ? undefined
                          : (value as (typeof VIDEO_GENRES)[number]),
                    })
                  }
                >
                  <SelectTrigger id="cuts-video-genre" data-testid="cuts-genre-select">
                    <SelectValue placeholder={tOptions("genrePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tOptions("genrePlaceholder")}</SelectItem>
                    {VIDEO_GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {tOptions(`genre.${genre}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>{tOptions("timeframeLabel")}</Label>
                  {isLoadingDuration ? (
                    <Loader2 className="size-4 animate-spin text-[var(--fg-tertiary)]" />
                  ) : (
                    <Paragraph size="p6" tone="tertiary" className="tabular-nums">
                      {formatDuration(sliderValue[0])} – {formatDuration(sliderValue[1])}
                    </Paragraph>
                  )}
                </div>
                <Slider
                  min={0}
                  max={maxSec}
                  step={1}
                  value={sliderValue}
                  disabled={!durationSec || isLoadingDuration}
                  onValueChange={handleTimeframeChange}
                  aria-label={tOptions("timeframeLabel")}
                  data-testid="cuts-timeframe-slider"
                />
                <Paragraph size="p6" tone="quaternary">
                  {tOptions("timeframeHint")}
                </Paragraph>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {isUploading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Paragraph size="p6" tone="tertiary">
              {t("uploadProgress", { progress: Math.round(uploadProgress) })}
            </Paragraph>
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--line-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <DialogFooter>
        <Button
          type="button"
          disabled={!hasSource || isSubmitting}
          onClick={() => void onStartRun()}
          data-testid="cuts-start-run-button"
        >
          {isSubmitting
            ? isUploading
              ? t("uploading")
              : t("starting")
            : t("start")}
        </Button>
      </DialogFooter>

      <FilesPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectExisting}
        filterFile={isVideoFileForCuts}
        title={t("filePickerTitle")}
        description={t("filePickerDescription")}
        testId="cuts-file-picker-modal"
      />
    </>
  );
};
