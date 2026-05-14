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

export function ProcessesRulesStep({ form }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Processos e regras internas</h3>
      <FormField
        control={form.control}
        name="processes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Processos-chave</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva os principais processos da empresa (vendas, atendimento, operação...)."
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
        name="rules"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Regras de negócio</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Regras que a IA deve sempre respeitar ao gerar conteúdo ou interagir."
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
        name="tools"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ferramentas utilizadas</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Quais ferramentas a empresa usa no dia a dia? (CRM, ERP, Slack...)"
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
