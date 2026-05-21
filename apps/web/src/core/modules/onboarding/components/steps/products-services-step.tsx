"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import {
  RadioGroup,
  RadioGroupItem,
} from "src/core/shared/components/ui/radio-group";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { cn } from "src/core/shared/utils";
import {
  type OnboardingFormValues,
  onboardingTextareaMaxLengths,
} from "../onboarding-form-schema";
import { TextareaFieldHint } from "../textarea-field-hint";

const PRICING_OPTIONS = [
  {
    value: "Assinatura (SaaS)",
    description: "Cobrança mensal ou anual recorrente",
  },
  { value: "One-time", description: "Pagamento único por produto ou projeto" },
  { value: "Freemium", description: "Plano grátis com upgrades pagos" },
  { value: "Sob demanda", description: "Cobrança por uso ou por hora" },
  { value: "Híbrido", description: "Combinação de modelos" },
  { value: "Outro", description: "Modelo personalizado" },
];

type Props = { form: UseFormReturn<OnboardingFormValues> };

export function ProductsServicesStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">
          Produtos e serviços
        </h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Descreva o que você vende e como cobra por isso.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="products"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produtos / Serviços principais</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Liste os principais produtos ou serviços que sua empresa oferece."
                  maxLength={onboardingTextareaMaxLengths.products}
                  rows={4}
                  {...field}
                />
              </FormControl>
              <TextareaFieldHint
                currentLength={field.value.length}
                maxLength={onboardingTextareaMaxLengths.products}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pricing"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo de precificação</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                >
                  {PRICING_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`pricing-${option.value}`}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-[var(--r-md)] border p-3 transition-colors",
                        field.value === option.value
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line-default)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-hover)]",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          id={`pricing-${option.value}`}
                          value={option.value}
                          className="shrink-0"
                        />
                        <span
                          className={cn(
                            "text-[12.5px] font-medium",
                            field.value === option.value
                              ? "text-[var(--accent)]"
                              : "text-[var(--fg-primary)]",
                          )}
                        >
                          {option.value}
                        </span>
                      </div>
                      <p className="pl-6 text-[11.5px] text-[var(--fg-tertiary)]">
                        {option.description}
                      </p>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
