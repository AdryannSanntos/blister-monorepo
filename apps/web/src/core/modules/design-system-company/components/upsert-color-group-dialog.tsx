'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from 'src/core/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'src/core/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from 'src/core/shared/components/ui/form';
import { Input } from 'src/core/shared/components/ui/input';
import { Textarea } from 'src/core/shared/components/ui/textarea';
import type { DesignColorGroup } from '../hooks/use-company-design-system';

const schema = z.object({ name: z.string().trim().min(1, 'Informe o nome'), description: z.string().optional() });
type Values = z.infer<typeof schema>;

type Props = { open: boolean; onOpenChange: (open: boolean) => void; group?: DesignColorGroup | null; onSubmit: (values: Values) => Promise<void>; isPending: boolean };

export function UpsertColorGroupDialog({ open, onOpenChange, group, onSubmit, isPending }: Props) {
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', values: { name: group?.name ?? '', description: group?.description ?? '' } });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group ? 'Editar grupo de cores' : 'Novo grupo de cores'}</DialogTitle>
          <DialogDescription>Agrupe cores oficiais por funcao visual, produto ou hierarquia de uso.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel required>Nome</FormLabel><FormControl><Input placeholder="Ex: Primarias" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descricao</FormLabel><FormControl><Textarea placeholder="Quando este grupo deve ser usado?" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
