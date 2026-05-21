"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
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

type Props = {
  form: UseFormReturn<OnboardingFormValues>;
};

export function PositioningStep({ form }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        Posicionamento e proposta de valor
      </h3>
      <FormDescription>
        Defina a direcao da empresa e o valor que ela entrega com clareza.
      </FormDescription>
      <FormField
        control={form.control}
        name="mission"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Missão</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Qual é a razão de existir da sua empresa?"
                maxLength={onboardingTextareaMaxLengths.mission}
                rows={2}
                {...field}
              />
            </FormControl>
            <TextareaFieldHint
              currentLength={field.value.length}
              maxLength={onboardingTextareaMaxLengths.mission}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="vision"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Visão</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Onde sua empresa quer chegar?"
                maxLength={onboardingTextareaMaxLengths.vision}
                rows={2}
                {...field}
              />
            </FormControl>
            <TextareaFieldHint
              currentLength={field.value.length}
              maxLength={onboardingTextareaMaxLengths.vision}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="valueProposition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Proposta de valor</FormLabel>
            <FormControl>
              <Textarea
                placeholder="O que torna sua oferta única para o cliente?"
                maxLength={onboardingTextareaMaxLengths.valueProposition}
                rows={3}
                {...field}
              />
            </FormControl>
            <TextareaFieldHint
              currentLength={field.value.length}
              maxLength={onboardingTextareaMaxLengths.valueProposition}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
