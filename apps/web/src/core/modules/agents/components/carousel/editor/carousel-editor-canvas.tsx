"use client";

import Moveable from "react-moveable";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CarouselOutputSlide } from "@company-os/types";

import {
  CAROUSEL_SLIDE_HEIGHT,
  CAROUSEL_SLIDE_WIDTH,
  buildCarouselSlideSrcDoc,
} from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";
import { snapTranslate, type SnapGuide } from "./carousel-editor-snap";
import { CarouselSnapGuides } from "./carousel-editor-snap-guides";
import {
  collectFontFamiliesFromCss,
  collectFontFamiliesFromHtml,
  extractFontFamilyName,
  preloadCarouselEditorFonts,
} from "./carousel-editor-fonts";

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

// Parse the translate() component out of an element's inline transform.
const parseTranslate = (el: HTMLElement): [number, number] => {
  const match = (el.style.transform || "").match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
  return match ? [parseFloat(match[1] ?? "0"), parseFloat(match[2] ?? "0")] : [0, 0];
};

export type LayerInfo = {
  id: string;
  type: "text" | "image" | "other";
  label: string;
};

type Props = {
  slide: CarouselOutputSlide;
  scale: number;
  onLoad?: () => void;
};

export type CarouselEditorCanvasHandle = {
  getContentDocument: () => Document | null;
  getAllLayers: () => LayerInfo[];
};

type ProxyRect = { left: number; top: number; width: number; height: number };

export const CarouselEditorCanvas = forwardRef<CarouselEditorCanvasHandle, Props>(
  function CarouselEditorCanvas({ slide, scale, onLoad }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const proxyRef = useRef<HTMLDivElement>(null);
    const [realTarget, setRealTarget] = useState<HTMLElement | null>(null);
    const [proxyRect, setProxyRect] = useState<ProxyRect | null>(null);
    const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
    // Tracks the Moveable instance key — incrementing it forces a clean remount after
    // each drag/resize end so Moveable re-reads the proxy's position from scratch.
    const [moveableKey, setMoveableKey] = useState(0);
    // Holds the proxy div element for Moveable's `target` prop.
    // Updated via useEffect (post-commit) so Moveable never receives a null ref on
    // the same render cycle as the proxy div's first mount.
    const [moveableTarget, setMoveableTarget] = useState<HTMLElement | null>(null);
    // Captured on drag/resize START: the element's translate at that moment.
    const dragStartTranslateRef = useRef<[number, number]>([0, 0]);
    // Element's visual rect in iframe space at drag start — used to compute snap anchors.
    const dragStartIframeRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

    const selectedLayerId = useCarouselEditorStore((s) => s.selectedLayerId);
    const setSelectedLayerId = useCarouselEditorStore((s) => s.setSelectedLayerId);
    const updateSlideContent = useCarouselEditorStore((s) => s.updateSlideContent);

    // Computes the proxy rect from the real element's visual position in iframe space,
    // mapped into outer-canvas space using the current CSS scale factor.
    const syncProxy = useCallback(
      (el: HTMLElement) => {
        const rect = el.getBoundingClientRect(); // relative to the iframe's 1080×1350 viewport
        setProxyRect({
          left: rect.left * scale,
          top: rect.top * scale,
          width: rect.width * scale,
          height: rect.height * scale,
        });
        if (proxyRef.current) proxyRef.current.style.transform = "";
      },
      [scale],
    );

    useImperativeHandle(ref, () => ({
      getContentDocument: () => iframeRef.current?.contentDocument ?? null,
      getAllLayers: () => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return [];
        return Array.from(doc.querySelectorAll<HTMLElement>("[data-carousel-layer-id]")).map(
          (el) => {
            const id = el.getAttribute("data-carousel-layer-id") ?? "";
            const tag = el.tagName.toLowerCase();
            const text = el.textContent?.trim() ?? "";
            const type: LayerInfo["type"] = tag === "img" ? "image" : text ? "text" : "other";
            const label =
              tag === "img" ? (el.getAttribute("alt") ?? "Imagem") : text.slice(0, 30) || tag;
            return { id, type, label };
          },
        );
      },
    }));

    useEffect(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const handleLoad = () => {
        const doc = iframe.contentDocument;
        if (!doc) return;
        assignLayerIds(doc);

        const fonts = new Set<string>([
          ...collectFontFamiliesFromCss(slide.cssContent),
          ...collectFontFamiliesFromHtml(slide.htmlContent),
        ]);

        doc.querySelectorAll<HTMLElement>("[style*='font-family']").forEach((element) => {
          fonts.add(extractFontFamilyName(element.style.fontFamily));
        });

        preloadCarouselEditorFonts(doc, fonts);
        onLoad?.();

        doc.body.addEventListener("click", (event) => {
          const el = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-carousel-layer-id]",
          );
          const layerId = el?.getAttribute("data-carousel-layer-id") ?? null;
          setSelectedLayerId(layerId);
          if (el) {
            setRealTarget(el);
            syncProxy(el);
          } else {
            setRealTarget(null);
            setProxyRect(null);
          }
        });
      };

      iframe.addEventListener("load", handleLoad);
      return () => iframe.removeEventListener("load", handleLoad);
    }, [setSelectedLayerId, slide.id, slide.cssContent, slide.htmlContent, syncProxy, onLoad]);

    // Sync when selectedLayerId changes externally (e.g., clicked from the layers list panel).
    useEffect(() => {
      if (!selectedLayerId || !iframeRef.current?.contentDocument) {
        setRealTarget(null);
        setProxyRect(null);
        return;
      }
      const el = iframeRef.current.contentDocument.querySelector<HTMLElement>(
        `[data-carousel-layer-id="${selectedLayerId}"]`,
      );
      if (el) {
        setRealTarget(el);
        syncProxy(el);
      } else {
        setRealTarget(null);
        setProxyRect(null);
      }
    }, [selectedLayerId, slide.id, syncProxy]);

    // Clear selection on slide switch.
    useEffect(() => {
      setRealTarget(null);
      setProxyRect(null);
    }, [slide.id]);

    // Re-sync proxy position when scale changes (panel resize / zoom adjustment).
    useEffect(() => {
      if (realTarget) syncProxy(realTarget);
    }, [scale, realTarget, syncProxy]);

    // Sync moveableTarget after the proxy div commits to the DOM.
    // proxyRef.current is always valid here (post-commit), unlike at JSX render time.
    useEffect(() => {
      setMoveableTarget(proxyRect ? proxyRef.current : null);
    }, [proxyRect, moveableKey]);

    // Returns bounding rects (in iframe space) of all layers EXCEPT the currently selected one.
    const getOtherElementRects = () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || !selectedLayerId) return [];
      return Array.from(doc.querySelectorAll<HTMLElement>("[data-carousel-layer-id]"))
        .filter((el) => el.getAttribute("data-carousel-layer-id") !== selectedLayerId)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, top: r.top, width: r.width, height: r.height };
        });
    };

    const commitSerialized = () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      updateSlideContent(slide.id, doc.body.innerHTML, slide.cssContent);
    };

    // Applies a translate that originated in outer-canvas space to the real iframe element.
    // Divides by `scale` to convert from outer pixels to iframe pixels, then composes
    // with the element's pre-drag baseline translate (captured in dragStartTranslateRef)
    // and any `--carousel-zoom` scale set by the zoom slider.
    const applyTranslateToReal = (el: HTMLElement, outerDx: number, outerDy: number) => {
      const [baseX, baseY] = dragStartTranslateRef.current;
      const newX = baseX + outerDx / scale;
      const newY = baseY + outerDy / scale;
      const zoom = el.style.getPropertyValue("--carousel-zoom");
      el.style.transform = `translate(${newX}px, ${newY}px)${zoom ? ` scale(${zoom})` : ""}`;
    };

    const handleDragResizeEnd = () => {
      setSnapGuides([]);
      commitSerialized();
      if (realTarget) syncProxy(realTarget);
      setMoveableKey((k) => k + 1);
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
        {/* Ghost proxy — transparent div sized/positioned to the selected element's visual
            footprint in outer-canvas space. Moveable targets this instead of the iframe's
            inner element so coordinates stay in the same document and scale. */}
        {proxyRect ? (
          <div
            ref={proxyRef}
            className="absolute"
            style={{
              left: proxyRect.left,
              top: proxyRect.top,
              width: proxyRect.width,
              height: proxyRect.height,
            }}
          />
        ) : null}
        <CarouselSnapGuides
          guides={snapGuides}
          scale={scale}
          canvasWidth={CAROUSEL_SLIDE_WIDTH * scale}
          canvasHeight={CAROUSEL_SLIDE_HEIGHT * scale}
        />
        {proxyRect && realTarget && moveableTarget ? (
          <Moveable
            key={moveableKey}
            target={moveableTarget}
            draggable
            resizable
            origin={false}
            onDragStart={() => {
              const [bx, by] = parseTranslate(realTarget);
              dragStartTranslateRef.current = [bx, by];
              const r = realTarget.getBoundingClientRect();
              dragStartIframeRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
              if (proxyRef.current) proxyRef.current.style.transform = "";
            }}
            onDrag={({ translate: [outerDx, outerDy] }) => {
              const startRect = dragStartIframeRectRef.current;
              if (!startRect) return;
              // Predicted visual position in iframe space after this drag delta
              const newLeft = startRect.left + outerDx / scale;
              const newTop = startRect.top + outerDy / scale;
              const snap = snapTranslate(
                newLeft,
                newTop,
                startRect.width,
                startRect.height,
                getOtherElementRects(),
                CAROUSEL_SLIDE_WIDTH,
                CAROUSEL_SLIDE_HEIGHT,
              );
              setSnapGuides(snap.guides);
              // Convert snapped visual position back to translate (iframe coords)
              const [baseX, baseY] = dragStartTranslateRef.current;
              const snapTranslateX = baseX + (snap.x - startRect.left);
              const snapTranslateY = baseY + (snap.y - startRect.top);
              const zoom = realTarget.style.getPropertyValue("--carousel-zoom");
              realTarget.style.transform = `translate(${snapTranslateX}px, ${snapTranslateY}px)${zoom ? ` scale(${zoom})` : ""}`;
              if (proxyRef.current) {
                proxyRef.current.style.left = `${snap.x * scale}px`;
                proxyRef.current.style.top = `${snap.y * scale}px`;
              }
            }}
            onDragEnd={handleDragResizeEnd}
            onResizeStart={() => {
              const [bx, by] = parseTranslate(realTarget);
              dragStartTranslateRef.current = [bx, by];
              const r = realTarget.getBoundingClientRect();
              dragStartIframeRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
              if (proxyRef.current) proxyRef.current.style.transform = "";
            }}
            onResize={({ target, width, height, drag }) => {
              (target as HTMLElement).style.width = `${width}px`;
              (target as HTMLElement).style.height = `${height}px`;
              (target as HTMLElement).style.transform = drag.transform;
              realTarget.style.width = `${width / scale}px`;
              realTarget.style.height = `${height / scale}px`;
              const [dx, dy] = drag.translate;
              applyTranslateToReal(realTarget, dx, dy);
            }}
            onResizeEnd={handleDragResizeEnd}
          />
        ) : null}
      </div>
    );
  },
);
