import { cn } from "src/core/shared/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-hover)] before:absolute before:inset-y-0 before:left-0 before:w-1/2 before:content-[''] before:ds-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
