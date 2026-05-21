"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "src/core/shared/utils";

type TagInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function TagInput({
  value,
  onChange,
  placeholder,
  className,
}: TagInputProps) {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const tags = value
    ? value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag].join(", "));
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag).join(", "));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      const lastTag = tags.at(-1);
      if (lastTag) removeTag(lastTag);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap gap-1.5 rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--bg-sunken)] px-2 py-1.5 text-[13.5px] text-[var(--fg-primary)] shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[color-mix(in_oklch,var(--line-strong)_60%,var(--fg-quaternary))] focus-within:border-[var(--accent)] focus-within:bg-[var(--bg-base)] focus-within:ring-[3px] focus-within:ring-[var(--accent-soft)]",
        className,
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-5 items-center gap-1 rounded-[var(--r-sm)] border border-[var(--line-subtle)] bg-[var(--bg-active)] px-2 text-[11px] font-medium text-[var(--fg-secondary)]"
        >
          {tag}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => removeTag(tag)}
            className="text-[var(--fg-quaternary)] hover:text-[var(--fg-primary)]"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-[var(--fg-quaternary)]"
      />
    </div>
  );
}
