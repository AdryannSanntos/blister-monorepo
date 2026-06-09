"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { cn } from "src/core/shared/utils";

type PasswordStrengthProps = { password: string };

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations("passwordStrength");

  const rules = useMemo(
    () => [
      { label: t("minLength"), test: (p: string) => p.length >= 8 },
      { label: t("uppercase"), test: (p: string) => /[A-Z]/.test(p) },
      { label: t("number"), test: (p: string) => /[0-9]/.test(p) },
      { label: t("special"), test: (p: string) => /[^A-Za-z0-9]/.test(p) },
    ],
    [t],
  );

  const strengthConfig = useMemo(
    () => [
      { label: "", color: "bg-[var(--line-default)]" },
      { label: t("weak"), color: "bg-destructive" },
      { label: t("fair"), color: "bg-[var(--warning)]" },
      { label: t("good"), color: "bg-[var(--warning)]" },
      { label: t("strong"), color: "bg-[var(--success)]" },
    ],
    [t],
  );

  if (!password) return null;

  const strength = rules.filter((rule) => rule.test(password)).length;
  const config = strengthConfig[strength] ?? strengthConfig[0];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i <= strength ? config.color : "bg-[var(--line-default)]",
            )}
          />
        ))}
      </div>
      {config.label ? (
        <p className="text-[11.5px] text-[var(--fg-tertiary)]">
          {t("strength", { label: config.label })}
        </p>
      ) : null}
      <ul className="space-y-1">
        {rules.map((rule) => {
          const passed = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5 text-[11.5px]">
              {passed ? (
                <Check className="size-3 text-[var(--success)]" />
              ) : (
                <X className="size-3 text-[var(--fg-quaternary)]" />
              )}
              <span
                className={
                  passed
                    ? "text-[var(--fg-secondary)]"
                    : "text-[var(--fg-quaternary)]"
                }
              >
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
