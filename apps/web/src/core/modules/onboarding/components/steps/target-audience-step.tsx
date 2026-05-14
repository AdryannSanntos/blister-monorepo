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

export function TargetAudienceStep({ form }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Público-alvo</h3>
      <FormField
        control={form.control}
        name="idealCustomer"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cliente ideal</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva o perfil do seu cliente ideal (ICP)."
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
        name="painPoints"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dores e necessidades</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Quais são as principais dores que seu produto resolve?"
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
        name="channels"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Canais de aquisição</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Como seus clientes chegam até você? (orgânico, ads, indicação...)"
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
