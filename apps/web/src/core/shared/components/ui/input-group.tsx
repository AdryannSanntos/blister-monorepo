'use client';

import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';
import { Button } from 'src/core/shared/components/ui/button';
import { Input } from 'src/core/shared/components/ui/input';
import { Textarea } from 'src/core/shared/components/ui/textarea';
import {
  type ControlSize,
  controlHeightClass,
  controlHeightDataClasses,
  controlIconSizeClass,
  controlPaddingXDataClasses,
  controlRadiusDataClasses,
} from 'src/core/shared/styles/control-size';
import { cn } from 'src/core/shared/utils';

type InputGroupProps = React.ComponentProps<'div'> & {
  size?: ControlSize;
};

function InputGroup({ className, size = 'md', ...props }: InputGroupProps) {
  return (
    <div
      className={cn(
        'group/input-group relative flex min-w-0 w-full items-center gap-2 border border-[var(--line-strong)] bg-[var(--bg-sunken)] shadow-none outline-none transition-[background,border-color,box-shadow,color] duration-[140ms] ease-out hover:border-[color-mix(in_oklch,var(--line-strong)_60%,var(--fg-quaternary))]',
        controlHeightDataClasses,
        controlPaddingXDataClasses,
        controlRadiusDataClasses,
        'has-[>textarea]:h-auto has-[>textarea]:items-start has-[>textarea]:py-2',

        // Variants based on alignment.
        'has-[>[data-align=inline-start]]:[&>[data-slot=input-group-control]]:pl-0',
        'has-[>[data-align=inline-end]]:[&>[data-slot=input-group-control]]:pr-0',
        'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>[data-slot=input-group-control]]:pb-2',
        'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>[data-slot=input-group-control]]:pt-2',

        // Focus state.
        'has-[[data-slot=input-group-control]:focus]:border-[var(--accent)] has-[[data-slot=input-group-control]:focus]:bg-[var(--bg-base)] has-[[data-slot=input-group-control]:focus]:ring-[3px] has-[[data-slot=input-group-control]:focus]:ring-[var(--accent-soft)]',

        // Error state (self or descendant) — border always, ring only on focus.
        'aria-invalid:border-[var(--danger)] has-[[data-slot][aria-invalid=true]]:border-[var(--danger)]',
        'has-[[data-slot][aria-invalid=true]:focus]:border-[var(--danger)] has-[[data-slot][aria-invalid=true]:focus]:ring-[3px] has-[[data-slot][aria-invalid=true]:focus]:ring-[var(--danger-soft)]',
        'aria-invalid:has-[[data-slot=input-group-control]:focus]:border-[var(--danger)] aria-invalid:has-[[data-slot=input-group-control]:focus]:ring-[3px] aria-invalid:has-[[data-slot=input-group-control]:focus]:ring-[var(--danger-soft)]',

        className,
      )}
      {...props}
      data-slot="input-group"
      data-size={size}
    />
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 text-[13px] font-medium text-[var(--fg-tertiary)] select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[var(--r-sm)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        'inline-start': 'order-first has-[>button]:ml-[-0.35rem] has-[>kbd]:ml-[-0.25rem]',
        'inline-end': 'order-last has-[>button]:mr-[-0.35rem] has-[>kbd]:mr-[-0.25rem]',
        'block-start':
          'order-first w-full justify-start pt-1.5 group-has-[>input]/input-group:pt-1 [.border-b]:pb-3',
        'block-end':
          'order-last w-full justify-start pb-1.5 group-has-[>input]/input-group:pb-1 [.border-t]:pt-3',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
);

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva('flex items-center gap-2 text-[13px] shadow-none', {
  variants: {
    size: {
      xs: `${controlHeightClass.xs} gap-1 rounded-[var(--r-sm)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5`,
      sm: `${controlHeightClass.sm} gap-1.5 rounded-[var(--r-md)] px-2.5 has-[>svg]:px-2.5`,
      'icon-xs': `${controlIconSizeClass.xs} rounded-[var(--r-sm)] p-0 has-[>svg]:p-0`,
      'icon-sm': `${controlIconSizeClass.sm} rounded-[var(--r-md)] p-0 has-[>svg]:p-0`,
    },
  },
  defaultVariants: {
    size: 'xs',
  },
});

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size'> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-[13px] text-[var(--fg-tertiary)] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        'h-full flex-1 rounded-none border-0 bg-transparent px-0 shadow-none hover:border-0 focus:border-0 focus:bg-transparent focus:ring-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0',
        'data-[size=xs]:text-xs data-[size=sm]:text-[13px] data-[size=md]:text-sm data-[size=lg]:text-[15px] data-[size=xl]:text-base',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        'flex-1 resize-none rounded-none border-0 bg-transparent px-0 py-0 shadow-none hover:border-0 focus:border-0 focus:bg-transparent focus:ring-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0',
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
