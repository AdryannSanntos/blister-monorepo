"use client";

import Moveable from "react-moveable";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CarouselOutputSlide } from "@company-os/types";

import {
  CAROUSEL_SLIDE_HEIGHT,
  CAROUSEL_SLIDE_WIDTH,
  buildCarouselSlideSrcDoc,
} from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";

const EXPLICIT_SELECTOR = "[data-carousel-layer]";
const FALLBACK_SELECTOR = 'h1, h2, h3, p, .badge-pill, img, [class*="__bg"]';

const assignLayerIds = (doc: Document) => {
  const explicit = new Set<Element>();
  doc.querySelectorAll(EXPLICIT_SELECTOR).forEach((el, index) => {
    explicit.add(el);
    if (!el.getAttribute("data-carousel-layer-id")) {
      el.setAttribute("data-carousel-layer-id", `layer-${index}`);
    }
  });
  doc.querySelectorAll(FALLBACK_SELECTOR).forEach((el, index) => {
    if (explicit.has(el) || el.getAttribute("data-carousel-layer-id")) return;
    el.setAttribute("data-carousel-layer-id", `layer-fallback-${index}`);
  });
};

type Props = { slide: CarouselOutputSlide; scale: number };

export type CarouselEditorCanvasHandle = {
  getContentDocument: () => Document | null;
};

export const CarouselEditorCanvas = forwardRef<CarouselEditorCanvasHandle, Props>(
  function CarouselEditorCanvas({ slide, scale }, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const selectedLayerId = useCarouselEditorStore((s) => s.selectedLayerId);
  const setSelectedLayerId = useCarouselEditorStore((s) => s.setSelectedLayerId);
  const updateSlideContent = useCarouselEditorStore((s) => s.updateSlideContent);

  useImperativeHandle(ref, () => ({
    getContentDocument: () => iframeRef.current?.contentDocument ?? null,
  }));

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      assignLayerIds(doc);

      doc.body.addEventListener("click", (event) => {
        const el = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-carousel-layer-id]",
        );
        setSelectedLayerId(el?.getAttribute("data-carousel-layer-id") ?? null);
        setTarget(el);
      });
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [setSelectedLayerId, slide.id]);

  useEffect(() => {
    if (!selectedLayerId || !iframeRef.current?.contentDocument) return;
    const el = iframeRef.current.contentDocument.querySelector<HTMLElement>(
      `[data-carousel-layer-id="${selectedLayerId}"]`,
    );
    setTarget(el);
  }, [selectedLayerId, slide.id]);

  useEffect(() => {
    setTarget(null);
  }, [slide.id]);

  const commitSerialized = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    updateSlideContent(slide.id, doc.body.innerHTML, slide.cssContent);
  };

  // The layers panel's zoom slider stores its scale in a `--carousel-zoom` custom property
  // and composes it into `transform` alongside translate() (see
  // carousel-editor-layers-panel.tsx). Moveable's drag/resize callbacks only know about
  // translate(), so if we set `el.style.transform` to their value verbatim we'd silently drop
  // any zoom scale applied via the panel. Re-read `--carousel-zoom` here and re-compose so
  // dragging/resizing an image never resets its zoom.
  const applyMoveableTranslate = (el: HTMLElement, translate: string) => {
    const zoom = el.style.getPropertyValue("--carousel-zoom");
    el.style.transform = zoom ? `${translate} scale(${zoom})` : translate;
  };

  return (
    <div
      className="relative"
      style={{ width: CAROUSEL_SLIDE_WIDTH * scale, height: CAROUSEL_SLIDE_HEIGHT * scale }}
      data-testid="carousel-editor-canvas"
    >
      <iframe
        ref={iframeRef}
        key={slide.id}
        srcDoc={buildCarouselSlideSrcDoc(slide)}
        title={`Editor slide ${slide.order}`}
        scrolling="no"
        className="absolute left-0 top-0 border-none"
        style={{
          width: CAROUSEL_SLIDE_WIDTH,
          height: CAROUSEL_SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
      {target ? (
        <Moveable
          target={target}
          container={iframeRef.current?.contentDocument?.body ?? undefined}
          draggable
          resizable
          origin={false}
          onDrag={({ target: el, transform }) => {
            applyMoveableTranslate(el as HTMLElement, transform);
          }}
          onDragEnd={commitSerialized}
          onResize={({ target: el, width, height, drag }) => {
            (el as HTMLElement).style.width = `${width}px`;
            (el as HTMLElement).style.height = `${height}px`;
            applyMoveableTranslate(el as HTMLElement, drag.transform);
          }}
          onResizeEnd={commitSerialized}
        />
      ) : null}
    </div>
  );
},
);
