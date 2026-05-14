import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "src/core/shared/utils";

const paragraphVariants = cva("text-[var(--fg-secondary)]", {
  variants: {
    size: {
      p1: "text-[18px] leading-[1.55]",
      p2: "text-[16px] leading-[1.55]",
      p3: "text-[14px] leading-[1.55]",
      p4: "text-[13px] leading-[1.5]",
      p5: "text-[12px] leading-[1.45]",
      p6: "text-[11px] leading-[1.4]",
    },
    tone: {
      primary: "text-[var(--fg-primary)]",
      secondary: "text-[var(--fg-secondary)]",
      tertiary: "text-[var(--fg-tertiary)]",
      quaternary: "text-[var(--fg-quaternary)]",
    },
  },
  defaultVariants: {
    size: "p3",
    tone: "secondary",
  },
});

type ParagraphProps = Omit<React.HTMLAttributes<HTMLParagraphElement>, "color"> &
  VariantProps<typeof paragraphVariants> & {
    asChild?: boolean;
  };

function Paragraph({
  className,
  size = "p3",
  tone = "secondary",
  asChild = false,
  ...props
}: ParagraphProps) {
  const Comp = asChild ? Slot.Root : "p";
  return (
    <Comp
      data-slot="paragraph"
      data-size={size}
      data-tone={tone}
      className={cn(paragraphVariants({ size, tone }), className)}
      {...props}
    />
  );
}

export { Paragraph, paragraphVariants };
