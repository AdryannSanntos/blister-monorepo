"use client";

import type { ReactNode } from "react";

import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type MarketplaceSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export const MarketplaceSection = ({
  title,
  description,
  children,
}: MarketplaceSectionProps) => (
  <section className="flex flex-col gap-3">
    <div className="space-y-1">
      <Heading level="h5" as="h2">
        {title}
      </Heading>
      {description ? (
        <Paragraph size="p5" tone="tertiary">
          {description}
        </Paragraph>
      ) : null}
    </div>
    {children}
  </section>
);
