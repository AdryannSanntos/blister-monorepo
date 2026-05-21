import type * as React from 'react';

import { cn } from 'src/core/shared/utils';

type TextareaProps = React.ComponentProps<'textarea'> & {
  size?: 'sm' | 'md' | 'lg';
};

function Textarea({ className, size = 'md', ...props }: TextareaProps) {
  return (
    <textarea
      data-size={size}
      className={cn(
        'flex min-h-[68px] w-full resize-y rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--bg-sunken)] text-[var(--fg-primary)] shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[140ms] ease-out placeholder:text-[var(--fg-quaternary)] hover:border-[color-mix(in_oklch,var(--line-strong)_60%,var(--fg-quaternary))] disabled:cursor-not-allowed disabled:opacity-50',
        'data-[size=sm]:rounded-[var(--r-sm)] data-[size=sm]:px-2.5 data-[size=sm]:py-2 data-[size=sm]:text-[12.5px]',
        'data-[size=md]:px-3 data-[size=md]:py-2.5 data-[size=md]:text-[13.5px]',
        'data-[size=lg]:px-3.5 data-[size=lg]:py-3 data-[size=lg]:text-[15px]',
        'leading-[1.5]',
        'caret-[var(--accent)]',
        'focus:border-[var(--accent)] focus:bg-[var(--bg-base)] focus:ring-[3px] focus:ring-[var(--accent-soft)]',
        'read-only:cursor-default read-only:border-[var(--line-subtle)] read-only:bg-[var(--bg-sunken)]/50 read-only:hover:border-[var(--line-subtle)]',
        'aria-invalid:border-[var(--danger)]',
        'aria-invalid:focus:ring-[3px] aria-invalid:focus:ring-[var(--danger-soft)]',
        className,
      )}
      {...props}
      data-slot="textarea"
    />
  );
}

export { Textarea };
