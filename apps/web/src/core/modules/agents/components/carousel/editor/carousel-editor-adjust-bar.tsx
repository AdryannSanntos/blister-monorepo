"use client";

import { Sparkles, SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useCarouselAiEdit } from "src/core/modules/agents/hooks/use-carousel-ai-edit";
import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";

export const CarouselEditorAdjustBar = ({ runId, slideId }: { runId: string; slideId: string }) => {
  const t = useTranslations("carousel.editor");
  const [prompt, setPrompt] = useState("");
  const aiEdit = useCarouselAiEdit(runId);
  const updateSlideContent = useCarouselEditorStore((s) => s.updateSlideContent);

  const chips = [t("chipDirect"), t("chipShorten"), t("chipContrast")];

  const submit = async (text: string) => {
    if (!text.trim()) return;
    const currentSlide = useCarouselEditorStore.getState().slides.find((slide) => slide.id === slideId);
    const result = await aiEdit.mutateAsync({
      slideId,
      mode: "rewrite_text",
      prompt: text,
      currentHtmlContent: currentSlide?.htmlContent,
      currentCssContent: currentSlide?.cssContent,
    });
    updateSlideContent(slideId, result.htmlContent, result.cssContent);
    setPrompt("");
  };

  return (
    <div
      className="flex items-center gap-2 border-t border-[var(--line-subtle)] px-4 py-2.5"
      data-testid="carousel-adjust-bar"
    >
      <Sparkles className="size-4 shrink-0 text-[var(--accent)]" />
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => submit(chip)}
          disabled={aiEdit.isPending}
          className="shrink-0 rounded-full border border-[var(--line-default)] px-3 py-1 text-[12px] hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          {chip}
        </button>
      ))}
      <input
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit(prompt)}
        placeholder={t("promptPlaceholder")}
        className="min-w-0 flex-1 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
      />
      <button
        type="button"
        onClick={() => submit(prompt)}
        disabled={aiEdit.isPending || !prompt.trim()}
        aria-label={t("applyAdjust")}
        className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-md)] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
      >
        <SendHorizontal className="size-4" />
      </button>
    </div>
  );
};
