"use client";

import { useTranslations } from "next-intl";
import { socialNetworkValues } from "@company-os/types";
import { cn } from "src/core/shared/utils";

type SocialNetworkPickerProps = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
};

export function SocialNetworkPicker({
  value,
  onChange,
  disabled,
}: SocialNetworkPickerProps) {
  const t = useTranslations("brand.socialNetworks");

  const handleToggle = (network: string) => {
    if (disabled) return;
    if (value.includes(network)) {
      onChange(value.filter((item) => item !== network));
      return;
    }
    onChange([...value, network]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {socialNetworkValues.map((network) => {
        const selected = value.includes(network);
        return (
          <button
            key={network}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => handleToggle(network)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-[var(--dur-fast)]",
              selected
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-soft-text)]"
                : "border-[var(--line-default)] bg-[var(--bg-base)] text-[var(--fg-secondary)] hover:border-[var(--line-strong)] hover:text-[var(--fg-primary)]",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {t(`options.${network}`)}
          </button>
        );
      })}
    </div>
  );
}
