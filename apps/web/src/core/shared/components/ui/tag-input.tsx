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

export function TagInput({ value, onChange, placeholder, className }: TagInputProps) {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const tags = value
    ? value.split(",").map((t) => t.trim()).filter(Boolean)
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
      removeTag(tags[tags.length - 1]!);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-[var(--r-sm)] bg-[var(--bg-raised)] px-2 py-0.5 text-[12px] text-[var(--fg-secondary)]"
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
        className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
