"use client";

import type { AiModel, AiProvider } from "@company-os/types";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "src/core/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/core/shared/components/ui/popover";
import { cn } from "src/core/shared/utils";

export type ProviderModelGroup = {
  provider: AiProvider;
  models: AiModel[];
};

export const groupModelsByProvider = (
  models: AiModel[],
  providers: AiProvider[],
): ProviderModelGroup[] => {
  const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
  const grouped = new Map<string, AiModel[]>();

  for (const model of models) {
    const existing = grouped.get(model.providerId) ?? [];
    existing.push(model);
    grouped.set(model.providerId, existing);
  }

  return [...grouped.entries()]
    .map(([providerId, providerModels]) => ({
      provider: providerMap.get(providerId),
      models: [...providerModels].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      ),
    }))
    .filter((group): group is ProviderModelGroup => Boolean(group.provider))
    .sort((left, right) =>
      left.provider.name.localeCompare(right.provider.name, undefined, {
        sensitivity: "base",
      }),
    );
};

type AgentModelSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  models: AiModel[];
  providers: AiProvider[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
};

export function AgentModelSelect({
  value,
  onValueChange,
  models,
  providers,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled = false,
  id,
  "aria-invalid": ariaInvalid,
}: AgentModelSelectProps) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () => groupModelsByProvider(models, providers),
    [models, providers],
  );

  const selectedModel = useMemo(
    () => models.find((model) => model.id === value),
    [models, value],
  );

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedModel?.providerId),
    [providers, selectedModel],
  );

  const handleSelect = (modelId: string) => {
    onValueChange(modelId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          id={id}
          className={cn(
            "h-[var(--control-h-md)] w-full justify-between gap-2 rounded-[var(--r-md)] border-[1.5px] border-[var(--line-default)] bg-[var(--bg-base)] px-3 font-normal shadow-none hover:border-[var(--line-strong)] hover:bg-[var(--bg-base)]",
            !value && "text-[var(--fg-quaternary)]",
          )}
        >
          <span className="truncate text-left">
            {selectedModel
              ? `${selectedProvider?.name ?? ""} — ${selectedModel.name}`
              : placeholder}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 text-[var(--fg-tertiary)] transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[200] w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onWheel={(event) => event.stopPropagation()}
      >
        <Command className="max-h-80 overflow-hidden rounded-[var(--r-lg)] border-0 bg-[var(--bg-overlay)] shadow-none">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList
            className="max-h-64 min-h-0 flex-1 overflow-y-auto overscroll-contain"
            onWheel={(event) => event.stopPropagation()}
          >
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {groups.map((group, groupIndex) => (
              <Fragment key={group.provider.id}>
                {groupIndex > 0 ? <CommandSeparator /> : null}
                <CommandGroup
                  heading={group.provider.name}
                  className="overflow-visible"
                >
                  {group.models.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${group.provider.name} ${group.provider.slug} ${model.name} ${model.externalId}`}
                      onSelect={() => handleSelect(model.id)}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4 shrink-0 text-[var(--accent)]",
                          value === model.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[var(--fg-primary)]">
                          {model.name}
                        </span>
                        <span className="truncate text-xs text-[var(--fg-tertiary)]">
                          {model.externalId}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
