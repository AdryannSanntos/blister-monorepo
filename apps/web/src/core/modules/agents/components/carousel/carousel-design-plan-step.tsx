"use client";

import { CheckCircle2, ImageIcon, Loader2, Pencil, RefreshCw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import type { CarouselDesignPlan, CarouselSlideDesign, CarouselSlideType } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Textarea } from "src/core/shared/components/ui/textarea";

const SLIDE_TYPE_LABEL: Record<CarouselSlideType, string> = {
  start: "Abertura",
  text: "Texto",
  text_image: "Texto + Imagem",
  image: "Imagem",
};

type ImageSlotProps = {
  slide: CarouselSlideDesign;
  uploadedUrl?: string;
  onUpload: (slideId: string, url: string) => void;
};

const ImageSlot = ({ slide, uploadedUrl, onUpload }: ImageSlotProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Plano 2: cria object URL local (sem upload real)
    const url = URL.createObjectURL(file);
    onUpload(slide.id, url);
  };

  return (
    <div className="flex flex-col gap-2 rounded-[var(--r-lg)] border border-[var(--line-default)] p-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--fg-tertiary)]">Slide {slide.order}</span>
        <Paragraph size="p5" className="font-medium text-[var(--fg-primary)]">
          {slide.imageSlot}
        </Paragraph>
      </div>

      {uploadedUrl ? (
        <div className="relative">
          <img
            src={uploadedUrl}
            alt={slide.imageSlot}
            className="h-32 w-full rounded-[var(--r-md)] object-cover"
          />
          <button
            type="button"
            onClick={() => onUpload(slide.id, "")}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Remover imagem"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className="flex h-32 flex-col items-center justify-center gap-2 rounded-[var(--r-md)] border-2 border-dashed border-[var(--line-default)] text-[var(--fg-quaternary)] transition-colors hover:border-[var(--accent)] hover:bg-[color-mix(in_oklch,var(--accent)_5%,transparent)] hover:text-[var(--accent)]"
        >
          <Upload className="size-5" />
          <Paragraph size="p6" tone="tertiary">Clique ou arraste a imagem</Paragraph>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
};

type SlideDesignCardProps = {
  slide: CarouselSlideDesign;
  onNotesChange: (id: string, notes: string) => void;
};

const SlideDesignCard = ({ slide, onNotesChange }: SlideDesignCardProps) => {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(slide.layoutNotes);

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
      <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--fg-tertiary)]">Slide {slide.order}</span>
          <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
          <Badge variant="outline">Variação {slide.variationId.toUpperCase()}</Badge>
          {slide.needsImage && (
            <Badge variant="warning" className="flex items-center gap-1">
              <ImageIcon className="size-3" /> Precisa de imagem
            </Badge>
          )}
        </div>
        {!editing && (
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" /> Editar notas
          </Button>
        )}
      </div>

      <div className="p-4">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="xs" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="xs" onClick={() => { onNotesChange(slide.id, notes); setEditing(false); }}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <Paragraph size="p5" tone="secondary" className="leading-relaxed">
            {notes}
          </Paragraph>
        )}
      </div>
    </div>
  );
};

type Props = {
  status: CarouselPhaseStatus;
  plan: CarouselDesignPlan | null;
  imageUploads: Record<string, string>;
  onImageUpload: (slideId: string, url: string) => void;
  onApprove: (plan: CarouselDesignPlan, imageUploads: Record<string, string>) => void;
  onReject: () => void;
};

export const CarouselDesignPlanStep = ({
  status, plan, imageUploads, onImageUpload, onApprove, onReject,
}: Props) => {
  const [localPlan, setLocalPlan] = useState<CarouselDesignPlan | null>(plan);
  const [confirmReject, setConfirmReject] = useState(false);

  // Sync when plan arrives after reject
  if (status === "awaiting_action" && plan && !localPlan) {
    setLocalPlan(plan);
  }

  const handleNotesChange = (slideId: string, notes: string) => {
    if (!localPlan) return;
    setLocalPlan({
      ...localPlan,
      slides: localPlan.slides.map((s) =>
        s.id === slideId ? { ...s, layoutNotes: notes } : s,
      ),
    });
  };

  if (status === "idle") return null;

  if (status === "processing") {
    return (
      <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
        <Loader2 className="size-4 animate-spin" />
        <Paragraph size="p5" tone="tertiary">Montando plano de design...</Paragraph>
      </div>
    );
  }

  if (status === "completed" && localPlan) {
    const imageCount = localPlan.slides.filter((s) => s.needsImage).length;
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-[var(--success)]" />
        <Paragraph size="p5" tone="secondary">
          Plano de design aprovado —{" "}
          <span className="font-medium">{localPlan.slides.length} slides</span>
          {imageCount > 0 && `, ${imageCount} ${imageCount === 1 ? "imagem" : "imagens"}`}
        </Paragraph>
      </div>
    );
  }

  if (!localPlan) return null;

  const imageSlotsNeeded = localPlan.slides.filter((s) => s.needsImage);
  const uploadedCount = imageSlotsNeeded.filter(
    (s) => imageUploads[s.id] && imageUploads[s.id] !== "",
  ).length;
  const allImagesUploaded =
    imageSlotsNeeded.length === 0 || uploadedCount === imageSlotsNeeded.length;

  return (
    <div className="flex flex-col gap-6" data-testid="carousel-design-plan-step">
      <div className="flex flex-col gap-1">
        <Heading level="h6" as="h3">Revise o plano de design</Heading>
        <Paragraph size="p5" tone="tertiary">
          A IA escolheu as variações de layout para cada slide. Você pode editar as notas antes de aprovar.
        </Paragraph>
      </div>

      <div className="flex flex-col gap-4">
        {localPlan.slides.map((slide) => (
          <SlideDesignCard key={slide.id} slide={slide} onNotesChange={handleNotesChange} />
        ))}
      </div>

      {imageSlotsNeeded.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-subtle)] p-5">
          <div className="flex items-center justify-between">
            <Heading level="h6" as="h4">Imagens necessárias</Heading>
            <Badge variant={allImagesUploaded ? "success" : "secondary"}>
              {uploadedCount} de {imageSlotsNeeded.length} enviadas
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {imageSlotsNeeded.map((slide) => (
              <ImageSlot
                key={slide.id}
                slide={slide}
                uploadedUrl={imageUploads[slide.id]}
                onUpload={onImageUpload}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-4">
        {confirmReject ? (
          <div className="flex items-center gap-3">
            <Paragraph size="p5" tone="secondary">O plano de design será regenerado.</Paragraph>
            <Button variant="outline" size="sm" onClick={() => setConfirmReject(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => { setConfirmReject(false); setLocalPlan(null); onReject(); }}>
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
              onClick={() => localPlan && onApprove(localPlan, imageUploads)}
            >
              {!allImagesUploaded
                ? `Envie ${imageSlotsNeeded.length - uploadedCount} imagem(ns) para aprovar`
                : "Aprovar plano"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
