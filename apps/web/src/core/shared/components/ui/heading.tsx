import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "src/core/shared/utils";

const headingVariants = cva("font-medium text-[var(--fg-primary)]", {
  variants: {
    level: {
      h1: "text-[40px] leading-[1.05] font-semibold tracking-[-0.020em]",
      h2: "text-[30px] leading-[1.1] font-semibold tracking-[-0.018em]",
      h3: "text-[22px] leading-[1.2] font-semibold tracking-[-0.012em]",
      h4: "text-[18px] leading-[1.3] font-semibold tracking-[-0.008em]",
      h5: "text-[15px] leading-[1.35] font-semibold tracking-[-0.004em]",
      h6: "text-[13px] leading-[1.4] font-semibold tracking-[0]",
    },
  },
  defaultVariants: {
    level: "h1",
  },
});

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type HeadingProps = Omit<React.HTMLAttributes<HTMLHeadingElement>, "color"> &
  VariantProps<typeof headingVariants> & {
    as?: HeadingLevel;
    asChild?: boolean;
  };

function Heading({
  className,
  level = "h1",
  as,
  asChild = false,
  ...props
}: HeadingProps) {
  const Tag = (as ?? level) as HeadingLevel;
  const Comp = asChild ? Slot.Root : Tag;
  return (
    <Comp
      data-slot="heading"
      data-level={level}
      className={cn(headingVariants({ level }), className)}
      {...props}
    />
  );
}

export { Heading, headingVariants };
