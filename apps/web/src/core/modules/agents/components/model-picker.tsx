"use client";

import { Cpu } from "lucide-react";
import type { BuilderCatalog } from "src/core/modules/agents/hooks/use-agent-catalog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";

type Props = {
  catalog: BuilderCatalog | undefined;
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
};

export function ModelPicker({ catalog, value, onChange, disabled }: Props) {
  if (!catalog || catalog.models.length === 0) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-3 text-[12.5px] text-[var(--fg-quaternary)]">
        <Cpu className="size-3.5 shrink-0" />
        Carregando modelos...
      </div>
    );
  }

  const byProvider = catalog.providers
    .map((provider) => ({
      provider,
      models: catalog.models.filter((m) => m.providerId === provider.id),
    }))
    .filter((group) => group.models.length > 0);

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Cpu className="size-3.5 shrink-0 text-[var(--fg-tertiary)]" />
          <SelectValue placeholder="Selecionar modelo..." />
        </span>
      </SelectTrigger>
      <SelectContent position="popper">
        {byProvider.map(({ provider, models }) => (
          <SelectGroup key={provider.id}>
            <SelectLabel>{provider.name}</SelectLabel>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
