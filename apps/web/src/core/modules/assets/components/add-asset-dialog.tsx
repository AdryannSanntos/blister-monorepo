'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { type AssetRelationKind, useCreateAsset } from 'src/core/modules/assets/hooks/use-assets';
import { Button } from 'src/core/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/core/shared/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'src/core/shared/components/ui/form';
import { Input } from 'src/core/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/core/shared/components/ui/select';
import { TagInput } from 'src/core/shared/components/ui/tag-input';
import { Textarea } from 'src/core/shared/components/ui/textarea';
import { z } from 'zod';

const baseCategories = [
  { value: 'brand', label: 'Marca' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'institutional', label: 'Institucional' },
  { value: 'published-content', label: 'Conteúdo publicado' },
  { value: 'visual-reference', label: 'Referência visual' },
  { value: 'page', label: 'Página' },
  { value: 'campaign', label: 'Campanha' },
  { value: 'other', label: 'Outro' },
] as const;

const visibleTypes = [
  { value: 'document', label: 'Documento' },
  { value: 'image', label: 'Imagem' },
  { value: 'pdf', label: 'PDF' },
  { value: 'link', label: 'Link' },
  { value: 'other', label: 'Outro' },
] as const;

const relationFields: Array<{ key: AssetRelationKind; label: string }> = [
  { key: 'campaign', label: 'Campanhas' },
  { key: 'channel', label: 'Canais' },
  { key: 'product', label: 'Produtos/serviços' },
  { key: 'page', label: 'Páginas' },
  { key: 'output', label: 'Execuções' },
];

const assetFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título do asset'),
  description: z.string().trim().optional(),
  sourceKind: z.enum(['file', 'url']),
  sourceUrl: z.string().trim().optional(),
  visibleType: z.string().trim().min(1, 'Selecione o tipo visível'),
  visibleCategory: z.string().trim().min(1, 'Selecione a categoria'),
  tags: z.string().optional(),
  campaign: z.string().optional(),
  channel: z.string().optional(),
  product: z.string().optional(),
  page: z.string().optional(),
  output: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

type AddAssetDialogProps = {
  mode: 'context' | 'operational';
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function splitTags(value?: string) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function AddAssetDialog({ mode, orgId, open, onOpenChange }: AddAssetDialogProps) {
  const createAsset = useCreateAsset(orgId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      description: '',
      sourceKind: mode === 'context' ? 'url' : 'file',
      sourceUrl: '',
      visibleType: mode === 'context' ? 'document' : 'image',
      visibleCategory: mode === 'context' ? 'brand' : 'published-content',
      tags: '',
      campaign: '',
      channel: '',
      product: '',
      page: '',
      output: '',
    },
  });

  function resetState(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      setSelectedFile(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: AssetFormValues) {
    let sourceUrl = values.sourceUrl?.trim() || undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;

    if (values.sourceKind === 'file') {
      if (!selectedFile) {
        form.setError('title', { message: 'Selecione um arquivo para continuar' });
        return;
      }

      fileName = selectedFile.name;
      mimeType = selectedFile.type || undefined;
      sourceUrl = undefined;
    }

    if (values.sourceKind === 'url' && !sourceUrl) {
      form.setError('sourceUrl', { message: 'Informe a URL da fonte' });
      return;
    }

    const relations = relationFields.flatMap((field) =>
      splitTags(values[field.key]).map((value) => ({ kind: field.key, value })),
    );

    await createAsset.mutateAsync({
      title: values.title,
      description: values.description?.trim() || undefined,
      sourceKind: values.sourceKind,
      sourceUrl,
      fileName,
      mimeType,
      visibleType: values.visibleType,
      visibleCategory: values.visibleCategory,
      tags: splitTags(values.tags),
      contextRole: mode === 'context',
      operationalRole: mode === 'operational',
      relations,
    });

    resetState(false);
  }

  const sourceKind = form.watch('sourceKind');

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'context' ? 'Adicionar fonte de contexto' : 'Adicionar asset operacional'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'context'
              ? 'Cadastre materiais que ajudam a enriquecer o contexto oficial da empresa.'
              : 'Cadastre materiais reutilizáveis para conteúdo, páginas e campanhas futuras.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Brand book 2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceKind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="file">Arquivo</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição curta</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explique rapidamente o que esse material representa."
                      className="min-h-[96px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {sourceKind === 'url' ? (
              <FormField
                control={form.control}
                name="sourceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da fonte</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." type="url" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Arquivo</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={(event) => {
                      setSelectedFile(event.target.files?.[0] ?? null);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="visibleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo visível</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visibleTypes.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="visibleCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria visível</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {baseCategories.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Labels visíveis</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Adicione labels visíveis para organização"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              {relationFields.map((field) => (
                <FormField
                  key={field.key}
                  control={form.control}
                  name={field.key}
                  render={({ field: relationField }) => (
                    <FormItem>
                      <FormLabel>{field.label}</FormLabel>
                      <FormControl>
                        <TagInput
                          value={relationField.value ?? ''}
                          onChange={relationField.onChange}
                          placeholder={`Associe ${field.label.toLowerCase()}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => resetState(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAsset.isPending}>
                {createAsset.isPending ? 'Salvando...' : 'Salvar asset'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
