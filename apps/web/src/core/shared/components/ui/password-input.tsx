'use client';

import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { Input } from 'src/core/shared/components/ui/input';
import {
  type ControlSize,
  controlInsetIconSizeClass,
} from 'src/core/shared/styles/control-size';
import { cn } from 'src/core/shared/utils';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>;

const passwordTogglePaddingClass: Record<ControlSize, string> = {
  xs: 'pr-8',
  sm: 'pr-9',
  md: 'pr-10',
  lg: 'pr-11',
  xl: 'pr-12',
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, uiSize = 'md', ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative" data-slot="password-input">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          uiSize={uiSize}
          className={cn(passwordTogglePaddingClass[uiSize], className)}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((v) => !v)}
          className={cn(
            'absolute top-1/2 right-1 flex -translate-y-1/2 items-center justify-center rounded-[var(--r-sm)] text-[var(--fg-tertiary)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-primary)] disabled:pointer-events-none disabled:opacity-45',
            controlInsetIconSizeClass[uiSize],
          )}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
