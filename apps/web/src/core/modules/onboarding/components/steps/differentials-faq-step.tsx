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

export function DifferentialsFaqStep({ form }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Diferenciais e FAQ</h3>
      <FormDescription>
        Registre os argumentos que fortalecem a marca e as respostas mais
        repetidas.
      </FormDescription>
      <FormField
        control={form.control}
        name="differentials"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Diferenciais competitivos</FormLabel>
            <FormControl>
              <Textarea
                placeholder="O que diferencia sua empresa dos concorrentes?"
                maxLength={onboardingTextareaMaxLengths.differentials}
                rows={4}
                {...field}
              />
            </FormControl>
            <TextareaFieldHint
              currentLength={field.value.length}
              maxLength={onboardingTextareaMaxLengths.differentials}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="faq"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Perguntas frequentes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Liste as perguntas mais comuns dos seus clientes e as respostas."
                maxLength={onboardingTextareaMaxLengths.faq}
                rows={5}
                {...field}
              />
            </FormControl>
            <TextareaFieldHint
              currentLength={field.value.length}
              maxLength={onboardingTextareaMaxLengths.faq}
              helperText="Voce pode agrupar perguntas e respostas no mesmo texto."
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
