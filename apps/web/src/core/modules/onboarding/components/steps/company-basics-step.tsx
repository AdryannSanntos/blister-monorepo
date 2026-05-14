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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { OnboardingFormValues } from "../onboarding-form-schema";

const INDUSTRIES = [
  "Tecnologia / SaaS",
  "E-commerce / Varejo",
  "Saúde e bem-estar",
  "Educação",
  "Finanças / Fintech",
  "Imobiliário",
  "Agência / Marketing",
  "Indústria / Manufatura",
  "Logística / Transporte",
  "Alimentação / Gastronomia",
  "Consultoria / Serviços B2B",
  "Outro",
];

type Props = { form: UseFormReturn<OnboardingFormValues> };

export function CompanyBasicsStep({ form }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-medium text-[var(--fg-primary)]">Dados básicos da empresa</h3>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Essas informações contextualizam todo o conteúdo gerado pelo Company OS.
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da empresa</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Segmento / Indústria</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição breve</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Em poucas frases, o que sua empresa faz e qual problema resolve?"
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
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website <span className="text-[var(--fg-quaternary)]">(opcional)</span></FormLabel>
              <FormControl>
                <Input placeholder="https://acme.com" type="url" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
