import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "src/core/shared/utils";

const displayVariants = cva(
  "font-serif text-[var(--fg-primary)] [text-wrap:balance]",
  {
    variants: {
      level: {
        d1: "text-[88px] leading-[0.96] tracking-[-0.030em]",
        d2: "text-[56px] leading-[1.00] tracking-[-0.025em]",
        d3: "text-[40px] leading-[1.05] tracking-[-0.020em] italic",
      },
    },
    defaultVariants: {
      level: "d1",
    },
  },
);

type DisplayProps = Omit<React.HTMLAttributes<HTMLHeadingElement>, "color"> &
  VariantProps<typeof displayVariants> & {
    as?: "h1" | "h2" | "h3" | "p" | "div";
    asChild?: boolean;
  };

function Display({
  className,
  level = "d1",
  as = "h1",
  asChild = false,
  ...props
}: DisplayProps) {
  const Comp = asChild ? Slot.Root : as;
  return (
    <Comp
      data-slot="display"
      data-level={level}
      className={cn(displayVariants({ level }), className)}
      {...props}
    />
  );
}

export { Display, displayVariants };
