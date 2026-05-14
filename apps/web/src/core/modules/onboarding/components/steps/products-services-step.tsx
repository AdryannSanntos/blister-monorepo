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

export function ProductsServicesStep({ form }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Produtos e serviços</h3>
      <FormField
        control={form.control}
        name="products"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Produtos / Serviços principais</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Liste os principais produtos ou serviços que sua empresa oferece."
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
        name="pricing"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo de precificação</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Como funciona a precificação? (assinatura, sob demanda, freemium...)"
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
