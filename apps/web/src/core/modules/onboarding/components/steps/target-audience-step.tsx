"use client";

import type { UseFormReturn } from "react-hook-form";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Textarea } from "src/core/shared/components/ui/textarea";
import {
  type OnboardingFormValues,
  onboardingTextareaMaxLengths,
} from "../onboarding-form-schema";
import { TextareaFieldHint } from "../textarea-field-hint";

const CHANNEL_OPTIONS = [
  "Orgânico / SEO",
  "Mídia paga (Ads)",
  "Indicação / Referral",
  "Email marketing",
  "Redes sociais",
  "Parcerias / Afiliados",
  "Eventos / Webinars",
  "Outbound / SDR",
  "Produto / PLG",
];

type Props = { form: UseFormReturn<OnboardingFormValues> };

function toggleChannel(current: string, channel: string): string {
  const channels = current ? current.split(", ").filter(Boolean) : [];
  if (channels.includes(channel)) {
    return channels.filter((c) => c !== channel).join(", ");
  }
  return [...channels, channel].join(", ");
}

export function TargetAudienceStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">
          Público-alvo
        </h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Defina para quem você vende e como essas pessoas chegam até você.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="idealCustomer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente ideal (ICP)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o perfil do seu cliente ideal: cargo, empresa, setor, tamanho..."
                  maxLength={onboardingTextareaMaxLengths.idealCustomer}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <TextareaFieldHint
                currentLength={field.value.length}
                maxLength={onboardingTextareaMaxLengths.idealCustomer}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="painPoints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dores e necessidades</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Quais são as principais dores que seu produto resolve?"
                  maxLength={onboardingTextareaMaxLengths.painPoints}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <TextareaFieldHint
                currentLength={field.value.length}
                maxLength={onboardingTextareaMaxLengths.painPoints}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="channels"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Canais de aquisição</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CHANNEL_OPTIONS.map((channel) => {
                    const checked = field.value
                      ? field.value.split(", ").includes(channel)
                      : false;
                    const channelId = `channel-${channel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                    return (
                      <label
                        key={channel}
                        htmlFor={channelId}
                        className="flex cursor-pointer items-center gap-2 rounded-[var(--r-md)] border border-[var(--line-default)] px-3 py-2.5 text-[12.5px] text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                      >
                        <Checkbox
                          id={channelId}
                          checked={checked}
                          onCheckedChange={() => {
                            field.onChange(toggleChannel(field.value, channel));
                          }}
                        />
                        {channel}
                      </label>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
