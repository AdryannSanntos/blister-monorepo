'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from 'src/core/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'src/core/shared/components/ui/dialog';
import { FileUpload } from 'src/core/shared/components/ui/file-upload';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from 'src/core/shared/components/ui/form';
import { Input } from 'src/core/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'src/core/shared/components/ui/select';
import { Textarea } from 'src/core/shared/components/ui/textarea';
import { type DesignAssetRole, useCreateDesignAsset } from '../hooks/use-company-design-system';

const roles: Array<{ value: DesignAssetRole; label: string }> = [
  { value: 'logo', label: 'Logo' }, { value: 'logo-variation', label: 'Variacao de logo' }, { value: 'brand-guideline', label: 'Brand guideline' }, { value: 'color-reference', label: 'Referencia de cor' }, { value: 'typography-reference', label: 'Referencia tipografica' }, { value: 'visual-reference', label: 'Referencia visual' }, { value: 'campaign-reference', label: 'Referencia de campanha' }, { value: 'product-visual', label: 'Visual de produto' }, { value: 'iconography', label: 'Iconografia' }, { value: 'template', label: 'Template' }, { value: 'context-reference', label: 'Referencia de contexto' }, { value: 'other', label: 'Outro' },
];

const schema = z.object({ fileName: z.string().trim().min(1, 'Informe o nome do arquivo'), description: z.string().optional(), primaryRole: z.enum(roles.map((role) => role.value) as [DesignAssetRole, ...DesignAssetRole[]]) });
type Values = z.infer<typeof schema>;

export function UploadDesignAssetDialog({ orgId, open, onOpenChange }: { orgId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const createAsset = useCreateDesignAsset(orgId);
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { fileName: '', description: '', primaryRole: 'visual-reference' } });

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    form.setValue('fileName', nextFile?.name ?? '', { shouldDirty: true, shouldValidate: Boolean(nextFile) });
  }

  async function onSubmit(values: Values) {
    if (!file) { form.setError('fileName', { message: 'Selecione um arquivo para enviar' }); return; }
    await createAsset.mutateAsync({ file, fileName: values.fileName.trim(), metadata: { description: values.description?.trim() || undefined, primaryRole: values.primaryRole } });
    setFile(null); form.reset(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enviar asset de design</DialogTitle><DialogDescription>Armazene logos, referencias e arquivos visuais oficiais. A IA usara metadados textuais no MVP.</DialogDescription></DialogHeader>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormItem><FormLabel required>Arquivo</FormLabel><FormControl><FileUpload value={file} onChange={handleFileChange} accept="image/*,.pdf,.svg" /></FormControl><FormMessage /></FormItem>
          <FormField control={form.control} name="fileName" render={({ field }) => <FormItem><FormLabel required>Nome do arquivo</FormLabel><FormControl><Input placeholder="logo-primary.png" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="primaryRole" render={({ field }) => <FormItem><FormLabel required>Papel principal</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{roles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
          <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Descricao</FormLabel><FormControl><Textarea placeholder="Como este asset deve ser usado?" {...field} /></FormControl><FormMessage /></FormItem>} />
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={createAsset.isPending}>{createAsset.isPending ? 'Enviando...' : 'Enviar asset'}</Button></DialogFooter>
        </form></Form>
      </DialogContent>
    </Dialog>
  );
}
