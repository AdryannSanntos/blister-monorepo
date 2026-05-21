'use client';

import type { ChangeEvent } from 'react';
import { Input } from 'src/core/shared/components/ui/input';
import { cn } from 'src/core/shared/utils';

type ColorSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

function normalizeHex(value: string) {
  const next = value.trim();
  if (!next) return '#000000';
  return next.startsWith('#') ? next : `#${next}`;
}

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function ColorSelect({ value, onChange, disabled, className }: ColorSelectProps) {
  const pickerValue = isValidHex(value) ? value : '#000000';

  function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(normalizeHex(event.target.value));
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] shadow-sm transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:scale-[1.02] focus-within:ring-2 focus-within:ring-[var(--ring-focus)]">
        <span className="size-6 rounded-[var(--r-sm)] border border-[var(--line-subtle)]" style={{ backgroundColor: pickerValue }} />
        <input
          type="color"
          value={pickerValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Input
        value={value}
        disabled={disabled}
        onChange={handleTextChange}
        placeholder="#000000"
        className="font-mono uppercase tabular-nums"
      />
    </div>
  );
}
