"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../onboarding-form-schema";

type Props = {
  form: UseFormReturn<OnboardingFormValues>;
};

export function ToneOfVoiceStep({ form }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Tom de voz e comunicação</h3>
      <FormField
        control={form.control}
        name="tone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tom de voz</FormLabel>
            <FormControl>
              <Input
                placeholder="Profissional, casual, técnico, acolhedor..."
                {...field}
              />
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
                placeholder="Como a empresa se comunica com clientes e parceiros?"
                rows={3}
                {...field}
              />
            </FormControl>
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
              <Textarea
                placeholder="Termos que não devem ser usados na comunicação da marca."
                rows={2}
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
