"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { TagInput } from "src/core/shared/components/ui/tag-input";
import { Textarea } from "src/core/shared/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "src/core/shared/components/ui/toggle-group";
import {
  type OnboardingFormValues,
  onboardingTextareaMaxLengths,
} from "../onboarding-form-schema";
import { TextareaFieldHint } from "../textarea-field-hint";

const TONE_OPTIONS = [
  { value: "Profissional", emoji: "💼" },
  { value: "Casual", emoji: "😊" },
  { value: "Técnico", emoji: "⚙️" },
  { value: "Acolhedor", emoji: "🤝" },
  { value: "Direto", emoji: "🎯" },
  { value: "Inspirador", emoji: "✨" },
];

type Props = { form: UseFormReturn<OnboardingFormValues> };

export function ToneOfVoiceStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">
          Tom de voz e comunicação
        </h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Como sua marca fala com o mundo. Isso guia toda a geração de conteúdo.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="tone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tom de voz principal</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(val) => {
                    if (val) field.onChange(val);
                  }}
                  className="flex flex-wrap gap-2"
                >
                  {TONE_OPTIONS.map((option) => (
                    <ToggleGroupItem
                      key={option.value}
                      value={option.value}
                      className="h-9 gap-1.5 rounded-[var(--r-md)] border border-[var(--line-default)] px-3 text-[12.5px] data-[state=on]:border-[var(--accent)] data-[state=on]:bg-[var(--accent-soft)] data-[state=on]:text-[var(--accent)]"
                    >
                      <span>{option.emoji}</span>
                      {option.value}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="communicationStyle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estilo de comunicação</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Como a empresa se comunica com clientes e parceiros? Seja específico."
                  maxLength={onboardingTextareaMaxLengths.communicationStyle}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <TextareaFieldHint
                currentLength={field.value.length}
                maxLength={onboardingTextareaMaxLengths.communicationStyle}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="avoidWords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Palavras ou expressões a evitar</FormLabel>
              <FormControl>
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Digite e pressione Enter para adicionar..."
                />
              </FormControl>
              <p className="text-[11.5px] text-[var(--fg-quaternary)]">
                Pressione Enter ou vírgula para adicionar cada item
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
