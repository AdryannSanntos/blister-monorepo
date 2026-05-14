"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { TagInput } from "src/core/shared/components/ui/tag-input";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../onboarding-form-schema";

type Props = { form: UseFormReturn<OnboardingFormValues> };

export function ProcessesRulesStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">Processos e regras internas</h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Estas informações garantem que o Company OS respeitará como sua empresa opera.
        </p>
      </div>
      <div className="space-y-4">
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
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Slack, HubSpot, Notion... pressione Enter para adicionar"
                />
              </FormControl>
              <p className="text-[11.5px] text-[var(--fg-quaternary)]">
                Pressione Enter ou vírgula para adicionar cada ferramenta
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
