'use client';

import { Bold, Code2, Heading2, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react';
import { useRef } from 'react';
import { cn } from 'src/core/shared/utils';

type ToolbarAction = {
  icon: React.ElementType;
  label: string;
  onTrigger: (textarea: HTMLTextAreaElement) => { value: string; selStart: number; selEnd: number };
};

function wrapSel(
  ta: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  placeholder: string,
) {
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  const v = ta.value;
  const selected = v.slice(s, e) || placeholder;
  const newVal = v.slice(0, s) + prefix + selected + suffix + v.slice(e);
  return { value: newVal, selStart: s + prefix.length, selEnd: s + prefix.length + selected.length };
}

function prefixLine(ta: HTMLTextAreaElement, prefix: string) {
  const s = ta.selectionStart;
  const v = ta.value;
  const lineStart = v.lastIndexOf('\n', s - 1) + 1;
  const newVal = v.slice(0, lineStart) + prefix + v.slice(lineStart);
  return { value: newVal, selStart: s + prefix.length, selEnd: s + prefix.length };
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    icon: Bold,
    label: 'Negrito',
    onTrigger: (ta) => wrapSel(ta, '**', '**', 'negrito'),
  },
  {
    icon: Italic,
    label: 'Itálico',
    onTrigger: (ta) => wrapSel(ta, '_', '_', 'itálico'),
  },
  {
    icon: Heading2,
    label: 'Título',
    onTrigger: (ta) => prefixLine(ta, '## '),
  },
  {
    icon: Quote,
    label: 'Citação',
    onTrigger: (ta) => prefixLine(ta, '> '),
  },
  {
    icon: List,
    label: 'Lista',
    onTrigger: (ta) => prefixLine(ta, '- '),
  },
  {
    icon: ListOrdered,
    label: 'Lista numerada',
    onTrigger: (ta) => prefixLine(ta, '1. '),
  },
  {
    icon: Code2,
    label: 'Código',
    onTrigger: (ta) => wrapSel(ta, '`', '`', 'código'),
  },
  {
    icon: Link2,
    label: 'Link',
    onTrigger: (ta) => wrapSel(ta, '[', '](url)', 'texto do link'),
  },
];

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Escreva em markdown…',
  rows = 8,
  disabled,
  className,
  'aria-invalid': ariaInvalid,
}: MarkdownEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  function applyAction(action: ToolbarAction) {
    const ta = taRef.current;
    if (!ta) return;
    const { value: newVal, selStart, selEnd } = action.onTrigger(ta);
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] transition-[border-color,box-shadow] duration-[var(--dur-fast)]',
        'focus-within:border-[var(--ring-focus)] focus-within:ring-2 focus-within:ring-[var(--ring-focus)]/25',
        ariaInvalid && 'border-[var(--danger)] focus-within:border-[var(--danger)] focus-within:ring-[var(--danger)]/30',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {/* toolbar */}
      <div className="flex items-center gap-0.5 border-b border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-2 py-1.5">
        {TOOLBAR_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          const isSep = i === 3 || i === 5;
          return (
            <span key={action.label} className="contents">
              {isSep && (
                <span className="mx-1 h-4 w-px shrink-0 bg-[var(--line-subtle)]" aria-hidden />
              )}
              <button
                type="button"
                title={action.label}
                disabled={disabled}
                onClick={() => applyAction(action)}
                className="flex size-6 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] disabled:pointer-events-none"
              >
                <Icon className="size-3.5" />
              </button>
            </span>
          );
        })}
        <span className="ml-auto text-[10px] text-[var(--fg-quaternary)] select-none">Markdown</span>
      </div>

      {/* textarea */}
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          'w-full resize-none bg-transparent p-3 font-mono text-[13px] leading-relaxed text-[var(--fg-primary)] outline-none placeholder:font-sans placeholder:text-[var(--fg-quaternary)]',
        )}
      />
    </div>
  );
}
