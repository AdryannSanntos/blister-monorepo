import type * as React from 'react';

import { cn } from 'src/core/shared/utils';

type InputProps = React.ComponentProps<'input'> & {
  uiSize?: 'sm' | 'md' | 'lg';
};

function Input({ className, type, uiSize = 'md', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-size={uiSize}
      className={cn(
        'w-full min-w-0 rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--bg-sunken)] py-0 text-[var(--fg-primary)] shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[140ms] ease-out selection:bg-[var(--accent-soft-hi)] selection:text-[var(--fg-primary)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-[var(--fg-secondary)] placeholder:text-[var(--fg-quaternary)] hover:border-[color-mix(in_oklch,var(--line-strong)_60%,var(--fg-quaternary))] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'data-[size=sm]:h-7 data-[size=sm]:rounded-[var(--r-sm)] data-[size=sm]:px-2.5 data-[size=sm]:text-[12.5px]',
        'data-[size=md]:h-9 data-[size=md]:px-3 data-[size=md]:text-[13.5px]',
        'data-[size=lg]:h-11 data-[size=lg]:px-3.5 data-[size=lg]:text-[15px]',
        'caret-[var(--accent)]',
        'focus:border-[var(--accent)] focus:bg-[var(--bg-base)] focus:ring-[3px] focus:ring-[var(--accent-soft)]',
        'read-only:cursor-default read-only:border-[var(--line-subtle)] read-only:bg-[var(--bg-sunken)]/50 read-only:hover:border-[var(--line-subtle)]',
        'aria-invalid:border-[var(--danger)]',
        'aria-invalid:focus:ring-[3px] aria-invalid:focus:ring-[var(--danger-soft)]',
        className,
      )}
      {...props}
      data-slot="input"
    />
  );
}

export { Input };
