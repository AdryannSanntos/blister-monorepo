import type * as React from 'react';

import {
  type ControlSize,
  controlHeightDataClasses,
  controlPaddingXDataClasses,
  controlRadiusDataClasses,
  controlTextDataClasses,
} from 'src/core/shared/styles/control-size';
import { cn } from 'src/core/shared/utils';

type InputProps = React.ComponentProps<'input'> & {
  uiSize?: ControlSize;
};

function Input({ className, type, uiSize = 'md', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-size={uiSize}
      className={cn(
        'w-full min-w-0 rounded-[var(--r-md)] border-[1.5px] border-[var(--line-default)] bg-[var(--bg-base)] py-0 font-sans text-[var(--fg-primary)] shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[140ms] ease-out selection:bg-[var(--accent-soft-hi)] selection:text-[var(--fg-primary)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-[var(--fg-secondary)] placeholder:text-[var(--fg-quaternary)] hover:border-[var(--line-strong)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--bg-sunken)] disabled:opacity-60',
        controlHeightDataClasses,
        controlPaddingXDataClasses,
        controlTextDataClasses,
        controlRadiusDataClasses,
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
