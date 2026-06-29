"use client";

import {
  allRequiredSlotsFilled,
  buildImageUploadKey,
  countFilledRequiredSlots,
  countRequiredSlots,
  type CarouselDesignPlan,
  type CarouselImageSlot,
  type CarouselSlideDesign,
  type CarouselSlideType,
} from "@company-os/types";
import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CarouselPhaseStatus } from "src/core/modules/agents/components/carousel/carousel-run-steps";
import {
  CarouselStepErrorState,
  CarouselStepLoadingState,
} from "src/core/modules/agents/components/carousel/carousel-step-states";
import { CAROUSEL_DESIGN_SECTION_ICON } from "src/core/modules/agents/components/carousel/carousel-step-icons";
import { useCarouselImageUpload } from "src/core/modules/agents/hooks/use-carousel-image-upload";
import { useFilePreviewUrl } from "src/core/modules/files/hooks/use-files-api";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { SurfaceIcon } from "src/core/shared/components/ui/surface-icon";
import { Textarea } from "src/core/shared/components/ui/textarea";

const SLIDE_TYPE_LABEL: Record<CarouselSlideType, string> = {
  start: "Abertura",
  text: "Texto",
  text_image: "Texto + Imagem",
  image: "Imagem",
};

type SlotImageUploadProps = {
  slideId: string;
  slot: CarouselImageSlot;
  fileId?: string;
  onUpload: (uploadKey: string, fileId: string) => void;
  onClear: (uploadKey: string) => void;
};

const SlotImageUpload = ({
  slideId,
  slot,
  fileId,
  onUpload,
  onClear,
}: SlotImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useCarouselImageUpload();
  const preview = useFilePreviewUrl(fileId ?? null, Boolean(fileId));
  const uploadKey = buildImageUploadKey(slideId, slot.slotKey);

  const handleFile = async (file: File) => {
    const result = await uploadImage.mutateAsync({
      file,
      slideId,
      slotKey: slot.slotKey,
    });
    onUpload(result.uploadKey, result.fileId);
  };

  const previewUrl = preview.data?.url;
  const isUploading = uploadImage.isPending;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Paragraph size="p6" tone="tertiary" className="font-medium">
          {slot.label}
        </Paragraph>
        {!slot.required ? (
          <Badge variant="secondary">Opcional</Badge>
        ) : null}
      </div>
      {slot.brief ? (
        <Paragraph size="p6" tone="secondary" className="leading-snug">
          {slot.brief}
        </Paragraph>
      ) : null}

      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt={slot.label}
            className="h-28 w-full rounded-[var(--r-md)] object-cover"
          />
          <button
            type="button"
            onClick={() => onClear(uploadKey)}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label={`Remover ${slot.label}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          className="flex h-28 flex-col items-center justify-center gap-2 rounded-[var(--r-md)] border-2 border-dashed border-[var(--line-default)] text-[var(--fg-quaternary)] transition-colors hover:border-[var(--accent)] hover:bg-[color-mix(in_oklch,var(--accent)_5%,transparent)] hover:text-[var(--accent)] disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Upload className="size-5" />
          )}
          <Paragraph size="p6" tone="tertiary">
            {isUploading ? "Enviando..." : "Clique ou arraste"}
          </Paragraph>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
};

type SlideDesignCardProps = {
  slide: CarouselSlideDesign;
  imageUploads: Record<string, string>;
  onNotesChange: (id: string, notes: string) => void;
  onImageUpload: (uploadKey: string, fileId: string) => void;
  onImageClear: (uploadKey: string) => void;
};

const SlideDesignCard = ({
  slide,
  imageUploads,
  onNotesChange,
  onImageUpload,
  onImageClear,
}: SlideDesignCardProps) => {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(slide.layoutNotes);

  const slotsWithUploads = slide.imageSlots.filter((slot) => slot.required);
  const filledSlots = slotsWithUploads.filter((slot) => {
    const key = buildImageUploadKey(slide.id, slot.slotKey);
    return Boolean(imageUploads[key]?.trim());
  }).length;

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
      <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SurfaceIcon
            icon={CAROUSEL_DESIGN_SECTION_ICON}
            className="size-9 shrink-0 rounded-[var(--r-md)]"
            iconClassName="size-4"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--fg-tertiary)]">
              Slide {slide.order}
            </span>
            <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
            {slide.imageSlots.length > 0 ? (
              <Badge variant="warning" className="flex items-center gap-1">
                <ImageIcon className="size-3" />
                {filledSlots}/{slotsWithUploads.length || slide.imageSlots.length}{" "}
                imagens
              </Badge>
            ) : null}
          </div>
        </div>
        {!editing ? (
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" /> Editar notas
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 p-4">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="xs" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button
                size="xs"
                onClick={() => {
                  onNotesChange(slide.id, notes);
                  setEditing(false);
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <Paragraph size="p5" tone="secondary" className="leading-relaxed">
            {notes}
          </Paragraph>
        )}

        {slide.imageSlots.length > 0 ? (
          <div className="grid gap-4 border-t border-[var(--line-soft)] pt-4 sm:grid-cols-2">
            {slide.imageSlots.map((slot) => {
              const uploadKey = buildImageUploadKey(slide.id, slot.slotKey);
              return (
                <SlotImageUpload
                  key={uploadKey}
                  slideId={slide.id}
                  slot={slot}
                  fileId={imageUploads[uploadKey]}
                  onUpload={onImageUpload}
                  onClear={onImageClear}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

type Props = {
  status: CarouselPhaseStatus;
  plan: CarouselDesignPlan | null;
  imageUploads: Record<string, string>;
  reviewMode?: boolean;
  currentStepKey?: string | null;
  runStatus?: string | null;
  errorMessage?: string | null;
  onImageUpload: (uploadKey: string, fileId: string) => void;
  onApprove: (plan: CarouselDesignPlan, imageUploads: Record<string, string>) => void;
  onUpdate?: (plan: CarouselDesignPlan, imageUploads: Record<string, string>) => void;
  onReject: () => void;
  onNewCarousel?: () => void;
};

export const CarouselDesignPlanStep = ({
  status,
  plan,
  imageUploads,
  reviewMode = false,
  currentStepKey,
  runStatus,
  errorMessage,
  onImageUpload,
  onApprove,
  onUpdate,
  onReject,
  onNewCarousel,
}: Props) => {
  const [localPlan, setLocalPlan] = useState<CarouselDesignPlan | null>(plan);
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => {
    if (plan) setLocalPlan(plan);
  }, [plan]);

  const handleNotesChange = (slideId: string, notes: string) => {
    if (!localPlan) return;
    const nextPlan = {
      ...localPlan,
      slides: localPlan.slides.map((s) =>
        s.id === slideId ? { ...s, layoutNotes: notes } : s,
      ),
    };
    setLocalPlan(nextPlan);
    if (reviewMode) onUpdate?.(nextPlan, imageUploads);
  };

  const handleImageClear = (uploadKey: string) => {
    onImageUpload(uploadKey, "");
  };

  if (status === "idle" || status === "processing") {
    return (
      <CarouselStepLoadingState
        stepId="design"
        currentStepKey={currentStepKey}
        runStatus={runStatus}
      />
    );
  }

  if (status === "error") {
    return (
      <CarouselStepErrorState
        stepId="design"
        message={errorMessage}
        onNewCarousel={onNewCarousel}
      />
    );
  }

  if (status === "completed" && !reviewMode && localPlan) {
    const requiredSlots = countRequiredSlots(localPlan);
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-[var(--success)]" />
        <Paragraph size="p5" tone="secondary">
          Plano de design aprovado —{" "}
          <span className="font-medium">{localPlan.slides.length} slides</span>
          {requiredSlots > 0 &&
            `, ${requiredSlots} ${requiredSlots === 1 ? "imagem" : "imagens"}`}
        </Paragraph>
      </div>
    );
  }

  if (!localPlan) {
    return (
      <CarouselStepLoadingState
        stepId="design"
        currentStepKey={currentStepKey}
        runStatus={runStatus}
      />
    );
  }

  const totalRequired = countRequiredSlots(localPlan);
  const filledRequired = countFilledRequiredSlots(localPlan, imageUploads);
  const allImagesUploaded = allRequiredSlotsFilled(localPlan, imageUploads);
  const showActions = status === "awaiting_action" && !reviewMode;

  return (
    <div className="flex flex-col gap-4" data-testid="carousel-design-plan-step">
      <div className="flex flex-col gap-1.5">
        <Heading level="h4" as="h3">
          Revise o plano de design
        </Heading>
        <Paragraph size="p5" tone="tertiary">
          A IA escolheu as variações de layout para cada slide. Envie as imagens
          necessárias antes de aprovar.
        </Paragraph>
        {totalRequired > 0 ? (
          <Paragraph size="p6" tone="tertiary">
            Imagens enviadas: {filledRequired}/{totalRequired}
          </Paragraph>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        {localPlan.slides.map((slide) => (
          <SlideDesignCard
            key={slide.id}
            slide={slide}
            imageUploads={imageUploads}
            onNotesChange={handleNotesChange}
            onImageUpload={onImageUpload}
            onImageClear={handleImageClear}
          />
        ))}
      </div>

      {showActions ? (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-4">
          {confirmReject ? (
            <div className="flex items-center gap-3">
              <Paragraph size="p5" tone="secondary">
                O plano de design será regenerado.
              </Paragraph>
              <Button variant="outline" size="sm" onClick={() => setConfirmReject(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setConfirmReject(false);
                  setLocalPlan(null);
                  onReject();
                }}
              >
                Regenerar
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmReject(true)}>
                <RefreshCw className="size-3.5" /> Regenerar plano
              </Button>
              <Button
                size="sm"
                disabled={!allImagesUploaded}
                onClick={() => {
                  if (!localPlan) return;
                  const filteredUploads = Object.fromEntries(
                    Object.entries(imageUploads).filter(([, value]) =>
                      value.trim(),
                    ),
                  );
                  onApprove(localPlan, filteredUploads);
                }}
              >
                {!allImagesUploaded
                  ? `Envie ${totalRequired - filledRequired} imagem(ns) para aprovar`
                  : "Aprovar plano"}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
