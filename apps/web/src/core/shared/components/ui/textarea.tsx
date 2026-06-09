import type * as React from 'react';

import {
  type ControlSize,
  controlPaddingXDataClasses,
  controlRadiusDataClasses,
  controlTextDataClasses,
} from 'src/core/shared/styles/control-size';
import { cn } from 'src/core/shared/utils';

type TextareaProps = React.ComponentProps<'textarea'> & {
  size?: ControlSize;
};

function Textarea({ className, size = 'md', ...props }: TextareaProps) {
  return (
    <textarea
      data-size={size}
      className={cn(
        'flex min-h-[88px] w-full resize-y rounded-[var(--r-md)] border-[1.5px] border-[var(--line-default)] bg-[var(--bg-base)] font-sans text-[var(--fg-primary)] shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[140ms] ease-out placeholder:text-[var(--fg-quaternary)] hover:border-[var(--line-strong)] disabled:cursor-not-allowed disabled:bg-[var(--bg-sunken)] disabled:opacity-60',
        controlPaddingXDataClasses,
        controlTextDataClasses,
        controlRadiusDataClasses,
        'data-[size=xs]:py-2 data-[size=sm]:py-2 data-[size=md]:py-3 data-[size=lg]:py-3.5 data-[size=xl]:py-4',
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
