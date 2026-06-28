"use client";

import { CheckCircle2, Loader2, Pencil, X, Check, RefreshCw } from "lucide-react";
import { useState } from "react";

import type { CarouselSlideContent, CarouselSlideType } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Textarea } from "src/core/shared/components/ui/textarea";

const SLIDE_TYPE_LABEL: Record<CarouselSlideType, string> = {
  start: "Abertura",
  text: "Texto",
  text_image: "Texto + Imagem",
  image: "Imagem",
};

type SlideCardProps = {
  slide: CarouselSlideContent;
  onChange: (updated: CarouselSlideContent) => void;
};

const SlideCard = ({ slide, onChange }: SlideCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slide);

  const handleSave = () => {
    onChange(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(slide);
    setEditing(false);
  };

  return (
    <div
      data-testid={`carousel-content-slide-${slide.id}`}
      className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--fg-tertiary)]">
            Slide {slide.order}
          </span>
          <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
        </div>
        {!editing ? (
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="ghost" size="xs" onClick={handleCancel}>
              <X className="size-3.5" /> Cancelar
            </Button>
            <Button variant="outline" size="xs" onClick={handleSave}>
              <Check className="size-3.5" /> Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {editing ? (
          <>
            {slide.title !== undefined && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--fg-tertiary)]">Título</label>
                <Textarea
                  rows={2}
                  value={draft.title ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
            )}
            {slide.body !== undefined && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--fg-tertiary)]">Texto</label>
                <Textarea
                  rows={3}
                  value={draft.body ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                />
              </div>
            )}
            {slide.callToAction !== undefined && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--fg-tertiary)]">Call to action</label>
                <Textarea
                  rows={1}
                  value={draft.callToAction ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, callToAction: e.target.value }))}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {slide.title && (
              <Paragraph className="font-semibold text-[var(--fg-primary)]">{slide.title}</Paragraph>
            )}
            {slide.body && (
              <Paragraph size="p5" tone="secondary" className="leading-relaxed">
                {slide.body}
              </Paragraph>
            )}
            {slide.callToAction && (
              <Paragraph size="p5" className="font-medium text-[var(--accent)]">
                {slide.callToAction}
              </Paragraph>
            )}
          </>
        )}
      </div>
    </div>
  );
};

type Props = {
  status: CarouselPhaseStatus;
  slides: CarouselSlideContent[];
  onApprove: (slides: CarouselSlideContent[]) => void;
  onReject: () => void;
};

export const CarouselContentStep = ({ status, slides, onApprove, onReject }: Props) => {
  const [localSlides, setLocalSlides] = useState<CarouselSlideContent[]>(slides);
  const [confirmReject, setConfirmReject] = useState(false);

  // Sync when new slides arrive (after reject → regenerate)
  if (status === "awaiting_action" && slides !== localSlides && localSlides.length === 0) {
    setLocalSlides(slides);
  }

  const handleSlideChange = (updated: CarouselSlideContent) => {
    setLocalSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  if (status === "idle") return null;

  if (status === "processing") {
    return (
      <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
        <Loader2 className="size-4 animate-spin" />
        <Paragraph size="p5" tone="tertiary">Gerando conteúdo dos slides...</Paragraph>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-[var(--success)]" />
        <Paragraph size="p5" tone="secondary">
          Conteúdo aprovado — <span className="font-medium">{slides.length} slides</span>
        </Paragraph>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="carousel-content-step">
      <div className="flex flex-col gap-1">
        <Heading level="h6" as="h3">Revise o conteúdo dos slides</Heading>
        <Paragraph size="p5" tone="tertiary">
          Edite qualquer slide antes de aprovar ou peça para regenerar tudo.
        </Paragraph>
      </div>

      <div className="flex flex-col gap-4">
        {(localSlides.length > 0 ? localSlides : slides).map((slide) => (
          <SlideCard key={slide.id} slide={slide} onChange={handleSlideChange} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-4">
        {confirmReject ? (
          <div className="flex items-center gap-3">
            <Paragraph size="p5" tone="secondary">Tem certeza? O conteúdo será regenerado.</Paragraph>
            <Button variant="outline" size="sm" onClick={() => setConfirmReject(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => { setConfirmReject(false); setLocalSlides([]); onReject(); }}>
              Regenerar
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReject(true)}
            >
              <RefreshCw className="size-3.5" /> Regenerar conteúdo
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(localSlides.length > 0 ? localSlides : slides)}
            >
              Aprovar conteúdo
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
