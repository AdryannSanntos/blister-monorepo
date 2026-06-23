import { Card, CardContent } from "src/core/shared/components/ui/card";
import { Heading } from "src/core/shared/components/ui/heading";

type MarketplaceItemSpecsCardProps = {
  specs: Record<string, string>;
  title: string;
};

export const MarketplaceItemSpecsCard = ({
  specs,
  title,
}: MarketplaceItemSpecsCardProps) => (
  <Card className="border-[var(--line-default)]">
    <CardContent className="p-5">
      <Heading level="h6" as="h3" className="mb-4">
        {title}
      </Heading>
      <dl className="grid gap-3 sm:grid-cols-2">
        {Object.entries(specs).map(([key, value]) =>
          value ? (
            <div
              key={key}
              className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-3"
            >
              <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                {key}
              </dt>
              <dd className="mt-1 text-sm text-[var(--fg-primary)]">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </CardContent>
  </Card>
);
