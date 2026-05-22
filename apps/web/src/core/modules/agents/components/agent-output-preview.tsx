"use client";

import { Badge } from "src/core/shared/components/ui/badge";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVisibleKey(key: string) {
  return !["confidence", "ranking", "retrieval", "metadata", "internal"].some(
    (blocked) => key.toLowerCase().includes(blocked),
  );
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return value.join(", ");
  return JSON.stringify(value, null, 2);
}

export function AgentOutputPreview({ output }: { output: unknown }) {
  if (!output) {
    return (
      <p className="text-[13px] text-[var(--fg-tertiary)]">
        Sem output registrado.
      </p>
    );
  }

  if (typeof output === "string") {
    return (
      <pre className="whitespace-pre-wrap text-[13px] leading-[1.6] text-[var(--fg-secondary)]">
        {output}
      </pre>
    );
  }

  if (Array.isArray(output)) {
    return (
      <div className="flex flex-wrap gap-2">
        {output.map((item) => (
          <Badge key={formatValue(item)} variant="secondary">
            {formatValue(item)}
          </Badge>
        ))}
      </div>
    );
  }

  if (!isPlainObject(output)) {
    return (
      <p className="text-[13px] text-[var(--fg-secondary)]">
        {formatValue(output)}
      </p>
    );
  }

  const visibleEntries = Object.entries(output).filter(([key]) =>
    isVisibleKey(key),
  );

  return (
    <div className="space-y-4">
      {visibleEntries.map(([key, value]) => (
        <section key={key} className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </p>
          {Array.isArray(value) ? (
            <ul className="space-y-2 text-[13px] text-[var(--fg-secondary)]">
              {value.map((item) => (
                <li
                  key={`${key}-${formatValue(item)}`}
                  className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-3 py-2"
                >
                  {formatValue(item)}
                </li>
              ))}
            </ul>
          ) : isPlainObject(value) ? (
            <pre className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] p-3 text-[12px] text-[var(--fg-secondary)]">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <p className="text-[13px] leading-[1.6] text-[var(--fg-secondary)]">
              {formatValue(value)}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
