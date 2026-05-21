'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from 'src/core/shared/components/ui/button';
import { ColorSelect } from 'src/core/shared/components/ui/color-select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'src/core/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from 'src/core/shared/components/ui/form';
import { Input } from 'src/core/shared/components/ui/input';
import { Textarea } from 'src/core/shared/components/ui/textarea';
import type { DesignColorToken } from '../hooks/use-company-design-system';

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome'),
  value: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Informe um hex valido'),
  usageNote: z.string().optional(),
  restrictionNote: z.string().optional(),
});
type Values = z.infer<typeof schema>;

type Props = { open: boolean; onOpenChange: (open: boolean) => void; token?: DesignColorToken | null; template?: DesignColorToken | null; onSubmit: (values: Values) => Promise<void>; isPending: boolean };

export function UpsertColorTokenDialog({ open, onOpenChange, token, template, onSubmit, isPending }: Props) {
  const initialValues = token ?? template;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    values: {
      name: initialValues?.name ?? '', value: initialValues?.value ?? '#000000', usageNote: initialValues?.usageNote ?? '', restrictionNote: initialValues?.restrictionNote ?? '',
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{token ? 'Editar cor' : 'Nova cor'}</DialogTitle>
          <DialogDescription>Defina o valor oficial, papel semantico e regras de uso da cor.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel required>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="value" render={({ field }) => <FormItem><FormLabel required>Cor</FormLabel><FormControl><ColorSelect value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <FormField control={form.control} name="usageNote" render={({ field }) => <FormItem><FormLabel>Uso recomendado</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="restrictionNote" render={({ field }) => <FormItem><FormLabel>Restricoes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar cor'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
