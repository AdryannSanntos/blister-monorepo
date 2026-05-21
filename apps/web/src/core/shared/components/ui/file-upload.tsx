'use client';

import { UploadCloud, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Button } from 'src/core/shared/components/ui/button';
import { cn } from 'src/core/shared/utils';

type FileUploadProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function FileUpload({ value, onChange, accept, disabled, className }: FileUploadProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--r-lg)] border border-dashed border-[var(--line-strong)] bg-[var(--bg-sunken)] transition-[border-color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-hover)] focus-within:border-[var(--ring-focus)] focus-within:ring-2 focus-within:ring-[var(--ring-focus)]',
        disabled && 'pointer-events-none opacity-45',
        className,
      )}
    >
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <div className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-base)] text-[var(--fg-tertiary)]">
          <UploadCloud className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
            {value ? value.name : 'Selecionar arquivo'}
          </p>
          <p className="text-[12px] text-[var(--fg-tertiary)]">
            {value ? `${value.type || 'application/octet-stream'} · ${formatFileSize(value.size)}` : 'Arraste ou clique para enviar um asset visual.'}
          </p>
        </div>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative z-20 shrink-0"
            onClick={() => onChange(null)}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
