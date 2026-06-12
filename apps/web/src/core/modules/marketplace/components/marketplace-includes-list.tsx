import { Check } from "lucide-react";

import { Card, CardContent } from "src/core/shared/components/ui/card";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type MarketplaceIncludesListProps = {
  title: string;
  items: string[];
};

export const MarketplaceIncludesList = ({
  title,
  items,
}: MarketplaceIncludesListProps) => (
  <Card className="border-[var(--line-default)]">
    <CardContent className="p-5">
      <Heading level="h6" as="h3" className="mb-4">
        {title}
      </Heading>
      <ul className="flex flex-col gap-3">
        {items.map((line) => (
          <li key={line} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)]">
              <Check className="size-3" aria-hidden />
            </span>
            <Paragraph size="p5" tone="secondary">
              {line}
            </Paragraph>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);
