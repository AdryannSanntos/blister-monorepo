"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BrandColorEntry, BrandPalette } from "@company-os/types";
import { ColorSelect } from "src/core/shared/components/ui/color-select";
import { Button } from "src/core/shared/components/ui/button";
import { Input } from "src/core/shared/components/ui/input";
import { Textarea } from "src/core/shared/components/ui/textarea";

const MAX_ADDITIONAL_COLORS = 8;

type PaletteEditorProps = {
  value: BrandPalette;
  onChange: (value: BrandPalette) => void;
  disabled?: boolean;
};

type BrandColorEntryEditorProps = {
  entry: BrandColorEntry;
  onChange: (entry: BrandColorEntry) => void;
  disabled?: boolean;
  title: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  showNameField?: boolean;
  onRemove?: () => void;
};

function BrandColorEntryEditor({
  entry,
  onChange,
  disabled,
  title,
  namePlaceholder,
  descriptionPlaceholder,
  showNameField = true,
  onRemove,
}: BrandColorEntryEditorProps) {
  const t = useTranslations("brand.visualSection");

  return (
    <div className="rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-base)] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
          {title}
        </p>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={onRemove}
            aria-label={t("removeColor")}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <ColorSelect
          value={entry.hex}
          onChange={(hex) => onChange({ ...entry, hex })}
          disabled={disabled}
        />

        {showNameField ? (
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[var(--fg-secondary)]">
              {t("colorName")}
            </label>
            <Input
              value={entry.name}
              disabled={disabled}
              placeholder={namePlaceholder}
              onChange={(event) =>
                onChange({ ...entry, name: event.target.value })
              }
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[var(--fg-secondary)]">
            {t("colorUsage")}
            <span className="ml-1 font-normal text-[var(--fg-tertiary)]">
              ({t("optional")})
            </span>
          </label>
          <Textarea
            rows={2}
            value={entry.description ?? ""}
            disabled={disabled}
            placeholder={descriptionPlaceholder}
            className="resize-none"
            onChange={(event) =>
              onChange({
                ...entry,
                description: event.target.value.trim()
                  ? event.target.value
                  : null,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function PaletteEditor({ value, onChange, disabled }: PaletteEditorProps) {
  const t = useTranslations("brand.visualSection");

  const handlePrimaryChange = (primary: BrandColorEntry) => {
    onChange({
      ...value,
      primary: {
        ...primary,
        id: value.primary.id,
        name: t("primaryDefaultName"),
      },
    });
  };

  const handleSecondaryChange = (secondary: BrandColorEntry) => {
    onChange({
      ...value,
      secondary: {
        ...secondary,
        id: value.secondary.id,
        name: t("secondaryDefaultName"),
      },
    });
  };

  const handleAdditionalChange = (index: number, entry: BrandColorEntry) => {
    const additional = [...value.additional];
    additional[index] = entry;
    onChange({ ...value, additional });
  };

  const handleAddColor = () => {
    if (value.additional.length >= MAX_ADDITIONAL_COLORS) return;
    onChange({
      ...value,
      additional: [
        ...value.additional,
        {
          id: crypto.randomUUID(),
          name: "",
          hex: "#000000",
          description: null,
        },
      ],
    });
  };

  const handleRemoveColor = (index: number) => {
    onChange({
      ...value,
      additional: value.additional.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
            {t("coreColors")}
          </p>
          <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
            {t("coreColorsDescription")}
          </p>
        </div>

        <BrandColorEntryEditor
          entry={value.primary}
          onChange={handlePrimaryChange}
          disabled={disabled}
          title={t("primaryColor")}
          namePlaceholder={t("primaryColorNamePlaceholder")}
          descriptionPlaceholder={t("primaryColorUsagePlaceholder")}
          showNameField={false}
        />

        <BrandColorEntryEditor
          entry={value.secondary}
          onChange={handleSecondaryChange}
          disabled={disabled}
          title={t("secondaryColor")}
          namePlaceholder={t("secondaryColorNamePlaceholder")}
          descriptionPlaceholder={t("secondaryColorUsagePlaceholder")}
          showNameField={false}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
            {t("additionalColors")}
          </p>
          <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
            {t("additionalColorsDescription")}
          </p>
        </div>

        {value.additional.length === 0 ? (
          <p className="text-[13px] text-[var(--fg-tertiary)]">
            {t("additionalColorsEmpty")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {value.additional.map((entry, index) => (
              <BrandColorEntryEditor
                key={entry.id}
                entry={entry}
                onChange={(next) => handleAdditionalChange(index, next)}
                disabled={disabled}
                title={t("additionalColorTitle", { index: index + 1 })}
                namePlaceholder={t("additionalColorNamePlaceholder")}
                descriptionPlaceholder={t("additionalColorUsagePlaceholder")}
                onRemove={() => handleRemoveColor(index)}
              />
            ))}
          </div>
        )}

        {value.additional.length < MAX_ADDITIONAL_COLORS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={handleAddColor}
            className="w-fit"
          >
            <Plus className="size-4" />
            {t("addColor")}
          </Button>
        )}
      </div>
    </div>
  );
}
