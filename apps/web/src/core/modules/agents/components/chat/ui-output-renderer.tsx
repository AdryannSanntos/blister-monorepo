"use client";

import { ExternalLink } from "lucide-react";
import { Markdown } from "@/components/agent-elements/markdown";
import { Button } from "src/core/shared/components/ui/button";
import { cn } from "src/core/shared/utils";

// ─── Block types (mirrors apps/api/src/agents/dto/ui-output.dto.ts) ──────────

type TextBlock = { type: "text"; value: string };
type MarkdownBlock = { type: "markdown"; value: string };
type ListBlock = { type: "list"; items: string[] };
type CardBlock = {
  type: "card";
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
};
type ImageBlock = {
  type: "image";
  url: string;
  alt?: string;
  metadata?: Record<string, unknown>;
};
type CtaBlock = {
  type: "cta";
  label: string;
  action: Record<string, unknown>;
};

export type UiOutputBlock =
  | TextBlock
  | MarkdownBlock
  | ListBlock
  | CardBlock
  | ImageBlock
  | CtaBlock;

export type UiOutputEnvelope = {
  blocks: UiOutputBlock[];
  metadata?: Record<string, unknown>;
};

// ─── Individual block renderers ───────────────────────────────────────────────

function TextBlockRenderer({ block }: { block: TextBlock }) {
  return (
    <p className="text-[13.5px] leading-relaxed text-[var(--fg-primary)]">
      {block.value}
    </p>
  );
}

function MarkdownBlockRenderer({ block }: { block: MarkdownBlock }) {
  return <Markdown content={block.value} />;
}

function ListBlockRenderer({ block }: { block: ListBlock }) {
  return (
    <ul className="space-y-1.5">
      {block.items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-[13px] text-[var(--fg-primary)]"
        >
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function CardBlockRenderer({ block }: { block: CardBlock }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
      <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
        {block.title}
      </p>
      {block.body && (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--fg-secondary)]">
          {block.body}
        </p>
      )}
    </div>
  );
}

function ImageBlockRenderer({ block }: { block: ImageBlock }) {
  return (
    <figure className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.url}
        alt={block.alt ?? "Imagem gerada"}
        className="w-full object-cover"
        loading="lazy"
      />
      {block.alt && (
        <figcaption className="px-3 py-2 text-[11px] text-[var(--fg-tertiary)]">
          {block.alt}
        </figcaption>
      )}
    </figure>
  );
}

function CtaBlockRenderer({ block }: { block: CtaBlock }) {
  const href = block.action.url as string | undefined;
  if (href) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a href={href} target="_blank" rel="noopener noreferrer">
          {block.label}
          <ExternalLink className="size-3.5" />
        </a>
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm">
      {block.label}
    </Button>
  );
}

// ─── Envelope renderer ───────────────────────────────────────────────────────

type Props = {
  envelope: UiOutputEnvelope;
  className?: string;
};

export function UiOutputRenderer({ envelope, className }: Props) {
  if (!envelope.blocks?.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {envelope.blocks.map((block, i) => {
        if (block.type === "text") {
          return <TextBlockRenderer key={i} block={block} />;
        }
        if (block.type === "markdown") {
          return <MarkdownBlockRenderer key={i} block={block} />;
        }
        if (block.type === "list") {
          return <ListBlockRenderer key={i} block={block} />;
        }
        if (block.type === "card") {
          return <CardBlockRenderer key={i} block={block} />;
        }
        if (block.type === "image") {
          return <ImageBlockRenderer key={i} block={block} />;
        }
        if (block.type === "cta") {
          return <CtaBlockRenderer key={i} block={block} />;
        }
        return null;
      })}
    </div>
  );
}

export function parseUiOutputEnvelope(metadata: unknown): UiOutputEnvelope | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const envelope = m.uiOutput;
  if (!envelope || typeof envelope !== "object") return null;
  const e = envelope as Record<string, unknown>;
  if (!Array.isArray(e.blocks)) return null;
  return envelope as UiOutputEnvelope;
}
