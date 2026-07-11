"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "src/core/shared/utils";

import {
  CAROUSEL_EDITOR_FONT_FAMILIES,
  formatFontFamilyCss,
  injectFontIntoPage,
} from "./carousel-editor-fonts";

const RECENTS_KEY = "carousel_recent_fonts";

const getRecentFonts = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};

const pushRecentFont = (font: string) => {
  const recent = getRecentFonts().filter((entry) => entry !== font);
  recent.unshift(font);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recent.slice(0, 5)));
};

export { injectFontIntoDoc } from "./carousel-editor-fonts";

type Props = {
  value: string;
  onChange: (font: string) => void;
};

export const CarouselFontPicker = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecents(getRecentFonts());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    CAROUSEL_EDITOR_FONT_FAMILIES.forEach(injectFontIntoPage);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query
    ? CAROUSEL_EDITOR_FONT_FAMILIES.filter((font) =>
        font.toLowerCase().includes(query.toLowerCase()),
      )
    : CAROUSEL_EDITOR_FONT_FAMILIES;

  const select = (font: string) => {
    pushRecentFont(font);
    onChange(font);
    setOpen(false);
    setQuery("");
  };

  const previewFamily = formatFontFamilyCss(value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-2.5 py-1.5 text-[13px] hover:border-[var(--line-strong)]"
        style={{ fontFamily: previewFamily }}
      >
        <span className="truncate">{value || "Selecionar fonte"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-[var(--fg-tertiary)]" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-overlay)] shadow-[var(--shadow-lg)]">
          <div className="border-b border-[var(--line-subtle)] p-2">
            <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-2.5 py-1.5">
              <Search className="size-3.5 shrink-0 text-[var(--fg-tertiary)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar fonte..."
                className="flex-1 bg-transparent text-[12px] outline-none"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {!query && recents.length > 0 ? (
              <>
                <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--fg-quaternary)]">
                  Recentes
                </div>
                {recents.map((font) => (
                  <FontOption key={`recent-${font}`} font={font} active={font === value} onSelect={select} />
                ))}
                <div className="my-1 border-t border-[var(--line-subtle)]" />
              </>
            ) : null}
            {filtered.map((font) => (
              <FontOption key={font} font={font} active={font === value} onSelect={select} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const FontOption = ({
  font,
  active,
  onSelect,
}: {
  font: string;
  active: boolean;
  onSelect: (font: string) => void;
}) => (
  <button
    type="button"
    onClick={() => onSelect(font)}
    className={cn(
      "flex w-full items-center px-3 py-2 text-left text-[13px] hover:bg-[var(--bg-hover)]",
      active && "bg-[var(--accent)]/10 text-[var(--accent)]",
    )}
    style={{ fontFamily: formatFontFamilyCss(font) }}
  >
    {font}
  </button>
);
