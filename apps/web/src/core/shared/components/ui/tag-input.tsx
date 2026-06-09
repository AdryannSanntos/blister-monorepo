"use client";

import { X } from "lucide-react";
import * as React from "react";
import {
  type ControlSize,
  controlMinHeightDataClasses,
  controlPaddingXDataClasses,
  controlRadiusDataClasses,
  controlTextDataClasses,
} from "src/core/shared/styles/control-size";
import { cn } from "src/core/shared/utils";

type TagInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: ControlSize;
  className?: string;
};

export function TagInput({
  value,
  onChange,
  placeholder,
  size = "md",
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
      data-size={size}
      className={cn(
        "flex flex-wrap items-center gap-1.5 border-[1.5px] border-[var(--line-default)] bg-[var(--bg-base)] py-1.5 text-[var(--fg-primary)] shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--line-strong)] focus-within:border-[var(--accent)] focus-within:ring-[3px] focus-within:ring-[var(--accent-soft)]",
        controlMinHeightDataClasses,
        controlPaddingXDataClasses,
        controlTextDataClasses,
        controlRadiusDataClasses,
        className,
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-7 items-center gap-1.5 rounded-[var(--r-sm)] bg-[var(--accent-soft)] pr-1.5 pl-2.5 text-[13px] font-semibold text-[var(--accent-soft-text)]"
        >
          {tag}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => removeTag(tag)}
            className="rounded-[5px] p-0.5 text-current opacity-70 hover:bg-[var(--accent-soft-hi)] hover:opacity-100"
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
