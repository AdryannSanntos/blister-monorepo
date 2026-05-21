"use client";

import { Clock, Download, ExternalLink, FileText, Globe, Maximize2, PenLine } from "lucide-react";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { MarkdownRenderer } from "src/core/shared/components/ui/markdown-renderer";
import type { ContextSource } from "../hooks/use-context-sources";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isImage(mimeType: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

function isPdf(mimeType: string | null) {
  return mimeType === "application/pdf";
}

function isMarkdown(mimeType: string | null, fileName: string | null) {
  return (
    mimeType === "text/markdown" ||
    Boolean(fileName?.endsWith(".md")) ||
    Boolean(fileName?.endsWith(".mdx"))
  );
}

function isText(mimeType: string | null) {
  return Boolean(
    mimeType?.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

// ─── preview panels ───────────────────────────────────────────────────────────

function ImagePanel({ url, title }: { url: string; title: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg-canvas)] p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={title}
        className="max-h-full max-w-full rounded-[var(--r-lg)] object-contain shadow-lg"
      />
    </div>
  );
}

function PdfPanel({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      title="PDF preview"
      className="h-full w-full border-0"
    />
  );
}

function MarkdownPanel({ content }: { content: string }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-6">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}

function TextPanel({ content }: { content: string }) {
  return (
    <div className="h-full overflow-auto bg-[var(--bg-sunken)] p-4">
      <pre className="min-w-max font-mono text-[12px] leading-relaxed text-[var(--fg-secondary)] whitespace-pre">
        {content}
      </pre>
    </div>
  );
}

function UrlPanel({ url }: { url: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line-subtle)] bg-[var(--bg-base)] px-4 py-2">
        <Globe className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
        <span className="flex-1 truncate font-mono text-[11px] text-[var(--fg-tertiary)]">
          {url}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
        >
          <ExternalLink className="size-3" />
          Abrir
        </a>
      </div>
      <iframe
        src={url}
        title="URL preview"
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}

function UnsupportedPanel({
  publicUrl,
  fileName,
}: {
  publicUrl?: string;
  fileName?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-[var(--r-xl)] bg-[var(--bg-sunken)]">
        <FileText className="size-7 text-[var(--fg-quaternary)]" />
      </div>
      <div className="space-y-1">
        <p className="text-[14px] font-medium text-[var(--fg-primary)]">
          Prévia não disponível
        </p>
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Este tipo de arquivo não pode ser visualizado no navegador.
        </p>
      </div>
      {publicUrl && (
        <a
          href={publicUrl}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm">
            <Download className="size-3.5" />
            Baixar arquivo
          </Button>
        </a>
      )}
    </div>
  );
}

function ProcessingPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-[var(--r-xl)] bg-[var(--bg-sunken)]">
        <Clock className="size-7 text-[var(--fg-quaternary)]" />
      </div>
      <div className="space-y-1">
        <p className="text-[14px] font-medium text-[var(--fg-primary)]">
          Conteúdo sendo processado
        </p>
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          O conteúdo do arquivo ainda está sendo extraído. Tente novamente em instantes.
        </p>
      </div>
    </div>
  );
}

// ─── main dialog ──────────────────────────────────────────────────────────────

type Props = {
  source: ContextSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const KIND_ICONS: Record<ContextSource["sourceKind"], React.ElementType> = {
  file: FileText,
  url: Globe,
  manual: PenLine,
};

const PROCESSING_STATUSES = new Set(["pending", "ingesting", "extracting"]);

export function ContextSourcePreviewDialog({ source, open, onOpenChange }: Props) {
  const KindIcon = KIND_ICONS[source.sourceKind];
  // For manual sources, description is the actual user-authored content.
  // For file/url sources, only use extracted content — description is metadata, not content.
  const manualContent =
    source.normalizedContent ?? source.extractedContent ?? source.description;
  const fileContent = source.normalizedContent ?? source.extractedContent;
  const isProcessing = PROCESSING_STATUSES.has(source.pipelineStatus);

  function renderPreview() {
    // Manual — always markdown (description IS the content)
    if (source.sourceKind === "manual") {
      return manualContent ? (
        <MarkdownPanel content={manualContent} />
      ) : (
        <UnsupportedPanel />
      );
    }

    // URL — iframe
    if (source.sourceKind === "url" && source.sourceUrl) {
      return <UrlPanel url={source.sourceUrl} />;
    }

    // File — detect by mimeType / fileName
    if (source.sourceKind === "file") {
      if (isImage(source.mimeType) && source.publicUrl) {
        return <ImagePanel url={source.publicUrl} title={source.title} />;
      }
      if (isPdf(source.mimeType) && source.publicUrl) {
        return <PdfPanel url={source.publicUrl} />;
      }
      if (isMarkdown(source.mimeType, source.fileName)) {
        if (fileContent) return <MarkdownPanel content={fileContent} />;
        if (isProcessing) return <ProcessingPanel />;
        return (
          <UnsupportedPanel
            publicUrl={source.publicUrl ?? undefined}
            fileName={source.fileName ?? undefined}
          />
        );
      }
      if (isText(source.mimeType)) {
        if (fileContent) return <TextPanel content={fileContent} />;
        if (isProcessing) return <ProcessingPanel />;
      }
      if (source.publicUrl) {
        return (
          <UnsupportedPanel
            publicUrl={source.publicUrl}
            fileName={source.fileName ?? undefined}
          />
        );
      }
    }

    return <UnsupportedPanel />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex shrink-0 flex-row items-center gap-3 border-b border-[var(--line-subtle)] px-5 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)]">
            <KindIcon className="size-3.5 text-[var(--fg-tertiary)]" />
          </div>
          <DialogTitle className="flex-1 truncate text-[14px] font-medium text-[var(--fg-primary)]">
            {source.title}
          </DialogTitle>
          {source.publicUrl && !isImage(source.mimeType) && !isPdf(source.mimeType) && (
            <a
              href={source.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
            >
              <Maximize2 className="size-3.5" />
              Abrir original
            </a>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
