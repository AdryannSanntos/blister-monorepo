"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { useCarouselImageUpload } from "src/core/modules/agents/hooks/use-carousel-image-upload";
import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";
import { useFilePreviewUrl } from "src/core/modules/files/hooks/use-files-api";
import { Slider } from "src/core/shared/components/ui/slider";
import { Textarea } from "src/core/shared/components/ui/textarea";

// react-moveable owns `transform: translate(...)` on the target element (see
// carousel-editor-canvas.tsx). The zoom slider must not clobber that on every change, so the
// zoom factor is tracked in a separate `--carousel-zoom` custom property and composed with
// whatever translate() is currently on the element. The canvas's onDrag/onResize handlers do
// the mirror-image composition (translate + existing --carousel-zoom) so neither side wins by
// overwriting the other's inline `transform`.
const getZoomScale = (target: HTMLElement | null) => {
  const raw = target?.style.getPropertyValue("--carousel-zoom");
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 1;
};

const applyZoomTransform = (target: HTMLElement, scale: number) => {
  const existing = target.style.transform || "";
  const translateMatch = existing.match(/translate\([^)]*\)/);
  const translate = translateMatch ? translateMatch[0] : "";
  target.style.setProperty("--carousel-zoom", String(scale));
  target.style.transform = translate ? `${translate} scale(${scale})` : `scale(${scale})`;
};

export const CarouselEditorLayersPanel = ({
  slideId,
  getSelectedElement,
}: {
  slideId: string;
  getSelectedElement: () => HTMLElement | null;
}) => {
  const selectedLayerId = useCarouselEditorStore((s) => s.selectedLayerId);
  const updateSlideContent = useCarouselEditorStore((s) => s.updateSlideContent);
  const slides = useCarouselEditorStore((s) => s.slides);
  const uploadImage = useCarouselImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileId, setPendingFileId] = useState<string | null>(null);
  // Captured synchronously when the upload starts, so the preview URL is applied to the
  // element that was selected at upload time — not whatever happens to be selected when
  // the (async) preview query resolves.
  const pendingTargetElRef = useRef<HTMLElement | null>(null);
  // Captured alongside pendingTargetElRef at upload time. This panel is not remounted
  // when the active slide changes (no `key` on it in carousel-editor-shell.tsx), so the
  // `slideId` prop is live and can change while an upload is in flight. We must commit
  // the resolved preview to the slide the upload was started for, not whatever slide
  // happens to be active when the preview query resolves.
  const pendingSlideIdRef = useRef<string | null>(null);
  // Guards against re-applying the same cached preview URL again on later, unrelated
  // re-renders (preview.data stays populated for staleTime after a successful upload).
  const appliedUrlRef = useRef<string | null>(null);

  const preview = useFilePreviewUrl(pendingFileId, Boolean(pendingFileId));

  const slide = slides.find((s) => s.id === slideId);

  useEffect(() => {
    if (preview.isError) {
      pendingTargetElRef.current = null;
      pendingSlideIdRef.current = null;
      setPendingFileId(null);
      toast.error("Não foi possível carregar a imagem enviada. Tente novamente.");
      return;
    }

    const url = preview.data?.url;
    if (!url || appliedUrlRef.current === url) return;

    const target = pendingTargetElRef.current;
    const targetSlideId = pendingSlideIdRef.current;
    if (target && targetSlideId) {
      (target as HTMLImageElement).src = url;
      const doc = target.ownerDocument;
      const currentSlide = useCarouselEditorStore
        .getState()
        .slides.find((s) => s.id === targetSlideId);
      if (doc && currentSlide) {
        updateSlideContent(targetSlideId, doc.body.innerHTML, currentSlide.cssContent);
        if (targetSlideId !== slideId) {
          toast.info("Imagem aplicada ao slide anterior.");
        }
      }
    }

    appliedUrlRef.current = url;
    pendingTargetElRef.current = null;
    pendingSlideIdRef.current = null;
    setPendingFileId(null);
  }, [preview.data?.url, preview.isError, slideId, updateSlideContent]);

  if (!selectedLayerId || !slide) {
    return (
      <div className="p-4 text-[13px] text-[var(--fg-quaternary)]">
        Clique em um elemento do slide para editar.
      </div>
    );
  }

  const commit = () => {
    const el = getSelectedElement();
    const doc = el?.ownerDocument;
    if (!doc) return;
    updateSlideContent(slideId, doc.body.innerHTML, slide.cssContent);
  };

  const el = getSelectedElement();
  const isImage = el?.tagName === "IMG";
  const isUploading = uploadImage.isPending || preview.isLoading;

  if (isImage) {
    const currentZoom = getZoomScale(el);

    return (
      <div className="flex flex-col gap-3 p-4">
        <label className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">
          Zoom
        </label>
        <Slider
          key={selectedLayerId}
          min={1}
          max={2}
          step={0.05}
          defaultValue={[currentZoom]}
          onValueChange={([value]) => {
            if (!el || value === undefined) return;
            applyZoomTransform(el, value);
          }}
          onValueCommit={commit}
        />
        <label className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">
          Imagem
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] px-3 py-2 text-[13px] hover:border-[var(--line-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="size-4" /> {isUploading ? "Enviando…" : "Trocar imagem"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            // Reset immediately so selecting the same file again still fires onChange.
            event.target.value = "";
            if (!file || !el) return;
            const targetEl = el;
            const slotKey = el.getAttribute("data-carousel-slot") ?? "image_url";
            try {
              const result = await uploadImage.mutateAsync({ file, slideId, slotKey });
              pendingTargetElRef.current = targetEl;
              pendingSlideIdRef.current = slideId;
              appliedUrlRef.current = null;
              setPendingFileId(result.fileId);
            } catch {
              toast.error("Não foi possível enviar a imagem. Tente novamente.");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <label className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">
        Texto
      </label>
      <Textarea
        key={selectedLayerId}
        defaultValue={el?.textContent ?? ""}
        onBlur={(event) => {
          if (el) el.textContent = event.target.value;
          commit();
        }}
      />
    </div>
  );
};
