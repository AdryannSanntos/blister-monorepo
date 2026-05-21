'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PermissionGate } from 'src/core/shared/components/permission-gate';
import { Button } from 'src/core/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/core/shared/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from 'src/core/shared/components/ui/form';
import { Textarea } from 'src/core/shared/components/ui/textarea';
import { type CompanyDesignSystem, useUpdateDesignIdentity } from '../hooks/use-company-design-system';

const schema = z.object({
  brandEssence: z.string().optional(),
  desiredPerception: z.string().optional(),
  visualStyle: z.string().optional(),
  antiPatterns: z.string().optional(),
  conceptualReferences: z.string().optional(),
  aiNotes: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const fields: Array<{ name: keyof Values; label: string; description: string; placeholder: string }> = [
  { name: 'brandEssence', label: 'Essencia da marca', description: 'O nucleo visual e conceitual da empresa.', placeholder: 'Ex: sofisticada, direta e orientada a execucao.' },
  { name: 'desiredPerception', label: 'Percepcao desejada', description: 'Como o publico deve perceber os materiais.', placeholder: 'Ex: confiavel, premium, objetivo.' },
  { name: 'visualStyle', label: 'Estilo visual', description: 'Direcao estetica para layouts, imagens e composicoes.', placeholder: 'Ex: editorial B2B com superficies limpas e contraste contido.' },
  { name: 'antiPatterns', label: 'O que evitar', description: 'Restricoes visuais e escolhas que quebram a marca.', placeholder: 'Ex: gradientes aleatorios, mascotes infantis, excesso de glow.' },
  { name: 'conceptualReferences', label: 'Referencias conceituais', description: 'Marcas, categorias ou sensacoes que orientam a estetica.', placeholder: 'Ex: dashboards financeiros, SaaS operacional, revistas de negocio.' },
  { name: 'aiNotes', label: 'Notas para IA', description: 'Instrucoes visuais explicitas para outputs gerados por IA.', placeholder: 'Ex: priorizar hierarquia e clareza antes de ornamentos.' },
];

function clean(values: Values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value?.trim() || null]));
}

export function DesignIdentityForm({ designSystem, orgId }: { designSystem: CompanyDesignSystem; orgId: string }) {
  const updateIdentity = useUpdateDesignIdentity(orgId);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    values: {
      brandEssence: designSystem.brandEssence ?? '',
      desiredPerception: designSystem.desiredPerception ?? '',
      visualStyle: designSystem.visualStyle ?? '',
      antiPatterns: designSystem.antiPatterns ?? '',
      conceptualReferences: designSystem.conceptualReferences ?? '',
      aiNotes: designSystem.aiNotes ?? '',
    },
  });
  return (
    <Card>
      <CardHeader className="border-b border-[var(--line-subtle)] p-5"><CardTitle>Identidade visual</CardTitle></CardHeader>
      <CardContent className="px-5 py-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => updateIdentity.mutateAsync(clean(values)))} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              {fields.map((item) => <FormField key={item.name} control={form.control} name={item.name} render={({ field }) => <FormItem><FormLabel>{item.label}</FormLabel><FormControl><Textarea className="min-h-[116px]" placeholder={item.placeholder} {...field} /></FormControl><FormDescription>{item.description}</FormDescription><FormMessage /></FormItem>} />)}
            </div>
            <div className="flex justify-end border-t border-[var(--line-subtle)] pt-4">
              <PermissionGate permission="design-system.update"><Button type="submit" disabled={updateIdentity.isPending}>{updateIdentity.isPending ? 'Salvando...' : 'Salvar identidade'}</Button></PermissionGate>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
