"use client";

import { CheckCircle2, Pencil, X, Check, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { CarouselSlideContent } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/components/carousel/carousel-run-steps";
import {
  CarouselStepErrorState,
  CarouselStepLoadingState,
} from "src/core/modules/agents/components/carousel/carousel-step-states";
import { CAROUSEL_CONTENT_SECTION_ICON } from "src/core/modules/agents/components/carousel/carousel-step-icons";
import {
  formatListItemsForTextarea,
  formatCarouselCopyPreviewHtml,
  getContentFieldsForSlide,
  getSlideFieldValue,
  getSlideNarrativeRole,
  hasSlideFieldValue,
  NARRATIVE_ROLE_LABEL_KEYS,
  parseListItemsFromText,
  SLIDE_TYPE_HINT_KEYS,
  type CarouselContentFieldDefinition,
  type CarouselContentFieldKey,
} from "src/core/modules/agents/utils/carousel-content-fields";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { SurfaceIcon } from "src/core/shared/components/ui/surface-icon";
import { Textarea } from "src/core/shared/components/ui/textarea";

type ContentFieldRowProps = {
  field: CarouselContentFieldDefinition;
  slide: CarouselSlideContent;
  draft: CarouselSlideContent;
  editing: boolean;
  onDraftChange: (next: CarouselSlideContent) => void;
};

const ContentFieldRow = ({
  field,
  slide,
  draft,
  editing,
  onDraftChange,
}: ContentFieldRowProps) => {
  const t = useTranslations("carousel.content");
  const value = getSlideFieldValue(editing ? draft : slide, field.key);
  const hasValue = hasSlideFieldValue(slide, field.key);

  if (!editing && !hasValue && field.optional) return null;

  const label = t(field.labelKey);
  const placement = t(field.placementKey);

  const handleTextChange = (key: CarouselContentFieldKey, text: string) => {
    if (key === "listItems") {
      onDraftChange({ ...draft, listItems: parseListItemsFromText(text) });
      return;
    }
    onDraftChange({ ...draft, [key]: text });
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--r-md)] border border-[var(--line-soft)] bg-[var(--bg-subtle)]/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-secondary)]">
          {label}
        </span>
        {field.optional ? <Badge variant="secondary">{t("optional")}</Badge> : null}
      </div>
      <Paragraph size="p6" tone="tertiary" className="leading-snug">
        {placement}
      </Paragraph>

      {editing ? (
        <Textarea
          rows={field.key === "listItems" ? 4 : field.key === "body" ? 4 : 2}
          value={
            field.key === "listItems"
              ? formatListItemsForTextarea(draft.listItems)
              : String(getSlideFieldValue(draft, field.key) ?? "")
          }
          onChange={(event) => handleTextChange(field.key, event.target.value)}
          placeholder={field.key === "listItems" ? t("listHint") : undefined}
          aria-label={label}
        />
      ) : field.key === "listItems" ? (
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {(slide.listItems ?? []).map((item) => (
            <li
              key={item}
              className="text-sm leading-relaxed text-[var(--fg-primary)]"
              dangerouslySetInnerHTML={{ __html: formatCarouselCopyPreviewHtml(item) }}
            />
          ))}
        </ul>
      ) : (
        <Paragraph
          className="whitespace-pre-line text-sm leading-relaxed text-[var(--fg-primary)]"
          dangerouslySetInnerHTML={{
            __html: value
              ? formatCarouselCopyPreviewHtml(String(value))
              : `<span class="text-[var(--fg-tertiary)]">${t("emptyField")}</span>`,
          }}
        />
      )}

      {field.key === "imageBrief" && editing ? (
        <Paragraph size="p6" tone="tertiary">
          {t("imageBriefHint")}
        </Paragraph>
      ) : null}
    </div>
  );
};

type SlideCardProps = {
  slide: CarouselSlideContent;
  onChange: (updated: CarouselSlideContent) => void;
};

const SlideCard = ({ slide, onChange }: SlideCardProps) => {
  const t = useTranslations("carousel.content");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slide);

  useEffect(() => {
    setDraft(slide);
  }, [slide]);

  const role = getSlideNarrativeRole(slide);
  const fields = getContentFieldsForSlide(slide);
  const typeHintKey = SLIDE_TYPE_HINT_KEYS[slide.type];

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
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SurfaceIcon
            icon={CAROUSEL_CONTENT_SECTION_ICON}
            className="size-9 shrink-0 rounded-[var(--r-md)]"
            iconClassName="size-4"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--fg-tertiary)]">
              Slide {slide.order}
            </span>
            <Badge variant="secondary">{t(NARRATIVE_ROLE_LABEL_KEYS[role])}</Badge>
            <Badge variant="outline">{t(typeHintKey)}</Badge>
          </div>
        </div>
        {!editing ? (
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            {t("edit")}
          </Button>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="ghost" size="xs" onClick={handleCancel}>
              <X className="size-3.5" /> {t("cancel")}
            </Button>
            <Button variant="outline" size="xs" onClick={handleSave}>
              <Check className="size-3.5" /> {t("save")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {fields.map((field) => (
          <ContentFieldRow
            key={field.key}
            field={field}
            slide={slide}
            draft={draft}
            editing={editing}
            onDraftChange={setDraft}
          />
        ))}
      </div>
    </div>
  );
};

type Props = {
  status: CarouselPhaseStatus;
  slides: CarouselSlideContent[];
  reviewMode?: boolean;
  currentStepKey?: string | null;
  runStatus?: string | null;
  errorMessage?: string | null;
  onApprove: (slides: CarouselSlideContent[]) => void;
  onUpdate?: (slides: CarouselSlideContent[]) => void;
  onReject: () => void;
  onNewCarousel?: () => void;
};

export const CarouselContentStep = ({
  status,
  slides,
  reviewMode = false,
  currentStepKey,
  runStatus,
  errorMessage,
  onApprove,
  onUpdate,
  onReject,
  onNewCarousel,
}: Props) => {
  const t = useTranslations("carousel.content");
  const [localSlides, setLocalSlides] = useState<CarouselSlideContent[]>(slides);
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => {
    if (slides.length > 0) setLocalSlides(slides);
  }, [slides]);

  const handleSlideChange = (updated: CarouselSlideContent) => {
    const nextSlides = localSlides.map((entry) => (entry.id === updated.id ? updated : entry));
    setLocalSlides(nextSlides);
    if (reviewMode) onUpdate?.(nextSlides);
  };

  if (status === "idle" || status === "processing") {
    return (
      <CarouselStepLoadingState
        stepId="content"
        currentStepKey={currentStepKey}
        runStatus={runStatus}
      />
    );
  }

  if (status === "error") {
    return (
      <CarouselStepErrorState
        stepId="content"
        message={errorMessage}
        onNewCarousel={onNewCarousel}
      />
    );
  }

  if (status === "completed" && !reviewMode) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-[var(--success)]" />
        <Paragraph size="p5" tone="secondary">
          {t("approved", { count: slides.length })}
        </Paragraph>
      </div>
    );
  }

  const displaySlides = localSlides.length > 0 ? localSlides : slides;
  const showActions = status === "awaiting_action" && !reviewMode;

  if (
    (status === "awaiting_action" || (status === "completed" && reviewMode)) &&
    displaySlides.length === 0
  ) {
    return (
      <CarouselStepLoadingState
        stepId="content"
        currentStepKey={currentStepKey}
        runStatus={runStatus}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="carousel-content-step">
      <div className="flex flex-col gap-1.5">
        <Heading level="h4" as="h3">
          {t("title")}
        </Heading>
        <Paragraph size="p5" tone="tertiary">
          {t("subtitle")}
        </Paragraph>
        <Paragraph size="p6" tone="tertiary">
          {t("markersHint")}
        </Paragraph>
      </div>

      <div className="flex flex-col gap-4">
        {displaySlides.map((slide) => (
          <SlideCard key={slide.id} slide={slide} onChange={handleSlideChange} />
        ))}
      </div>

      {showActions ? (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-4">
          {confirmReject ? (
            <div className="flex items-center gap-3">
              <Paragraph size="p5" tone="secondary">
                {t("confirmRegenerate")}
              </Paragraph>
              <Button variant="outline" size="sm" onClick={() => setConfirmReject(false)}>
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setConfirmReject(false);
                  setLocalSlides([]);
                  onReject();
                }}
              >
                {t("regenerate")}
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmReject(true)}>
                <RefreshCw className="size-3.5" /> {t("regenerate")}
              </Button>
              <Button
                size="sm"
                onClick={() => onApprove(localSlides.length > 0 ? localSlides : slides)}
              >
                {t("approve")}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
