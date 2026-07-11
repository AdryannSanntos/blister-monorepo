"use client";

import {
  applyFontFamilyToElement,
  formatFontFamilyCss,
  injectFontIntoDoc,
} from "./carousel-editor-fonts";

export type RichTextFormat =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "strikethrough" }
  | { type: "fontSize"; value: number }
  | { type: "fontFamily"; value: string }
  | { type: "color"; value: string }
  | { type: "fontWeight"; value: string }
  | { type: "textAlign"; value: "left" | "center" | "right" }
  | { type: "letterSpacing"; value: number }
  | { type: "lineHeight"; value: number };

const FONT_SIZE_ATTR = "data-rte-fontsize";

export interface RichTextEditor {
  activate: (el: HTMLElement, iframeDoc: Document) => void;
  deactivate: () => void;
  applyFormat: (fmt: RichTextFormat) => void;
  isActive: () => boolean;
}

export function createRichTextEditor(onCommit: () => void): RichTextEditor {
  let activeEl: HTMLElement | null = null;
  let activeDoc: Document | null = null;

  const onSelectionChange = () => {
    // no-op — hook for future selection-state callbacks
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") deactivate();
  };

  const onBlur = (e: FocusEvent) => {
    // Only deactivate if focus moved outside the active element entirely
    const related = e.relatedTarget as Node | null;
    if (!activeEl) return;
    if (related && activeEl.contains(related)) return;
    // Small delay so click-based format buttons in the panel can register
    setTimeout(() => {
      if (document.activeElement !== activeEl) deactivate();
    }, 120);
  };

  function activate(el: HTMLElement, iframeDoc: Document) {
    if (activeEl === el) return;
    if (activeEl) deactivate();
    activeEl = el;
    activeDoc = iframeDoc;
    el.contentEditable = "true";
    el.focus();
    iframeDoc.addEventListener("selectionchange", onSelectionChange);
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("blur", onBlur);
  }

  function deactivate() {
    if (!activeEl) return;
    activeEl.contentEditable = "false";
    activeEl.removeEventListener("keydown", onKeyDown);
    activeEl.removeEventListener("blur", onBlur);
    activeDoc?.removeEventListener("selectionchange", onSelectionChange);
    activeEl = null;
    activeDoc = null;
    onCommit();
  }

  function applyFormat(fmt: RichTextFormat) {
    const doc = activeDoc;
    if (!doc) return;
    doc.execCommand("styleWithCSS", false, "true");

    switch (fmt.type) {
      case "bold":
        doc.execCommand("bold");
        break;
      case "italic":
        doc.execCommand("italic");
        break;
      case "underline":
        doc.execCommand("underline");
        break;
      case "strikethrough":
        doc.execCommand("strikeThrough");
        break;
      case "color":
        doc.execCommand("foreColor", false, fmt.value);
        break;
      case "fontSize": {
        // execCommand fontSize only supports 1-7; use a span instead
        const sel = doc.getSelection();
        if (sel && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const span = doc.createElement("span");
          span.style.fontSize = `${fmt.value}px`;
          span.setAttribute(FONT_SIZE_ATTR, String(fmt.value));
          try {
            range.surroundContents(span);
          } catch {
            // partial selection; insert at cursor
            range.deleteContents();
            range.insertNode(span);
          }
        } else if (activeEl) {
          activeEl.style.fontSize = `${fmt.value}px`;
        }
        break;
      }
      case "fontFamily": {
        const cssFamily = formatFontFamilyCss(fmt.value);
        if (activeDoc) injectFontIntoDoc(activeDoc, fmt.value);
        const sel = doc.getSelection();
        if (sel && !sel.isCollapsed) {
          doc.execCommand("fontName", false, cssFamily);
        } else if (activeEl) {
          applyFontFamilyToElement(activeEl, fmt.value);
        }
        break;
      }
      case "fontWeight":
        if (activeEl) activeEl.style.fontWeight = fmt.value;
        break;
      case "textAlign":
        if (activeEl) activeEl.style.textAlign = fmt.value;
        break;
      case "letterSpacing":
        if (activeEl) activeEl.style.letterSpacing = `${fmt.value}px`;
        break;
      case "lineHeight":
        if (activeEl) activeEl.style.lineHeight = String(fmt.value);
        break;
    }
  }

  return { activate, deactivate, applyFormat, isActive: () => activeEl !== null };
}
