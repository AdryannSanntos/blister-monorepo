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

export function PositioningStep({ form }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        Posicionamento e proposta de valor
      </h3>
      <FormField
        control={form.control}
        name="mission"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Missão</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Qual é a razão de existir da sua empresa?"
                rows={2}
                {...field}
              />
            </FormControl>
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
                rows={2}
                {...field}
              />
            </FormControl>
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
                rows={3}
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
