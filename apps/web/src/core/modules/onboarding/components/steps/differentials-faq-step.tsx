"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../onboarding-form-schema";

type Props = {
  form: UseFormReturn<OnboardingFormValues>;
};

export function DifferentialsFaqStep({ form }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Diferenciais e FAQ</h3>
      <FormField
        control={form.control}
        name="differentials"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Diferenciais competitivos</FormLabel>
            <FormControl>
              <Textarea
                placeholder="O que diferencia sua empresa dos concorrentes?"
                rows={4}
                {...field}
              />
            </FormControl>
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
                rows={5}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
