'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from 'src/core/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/core/shared/components/ui/dialog';
import { FileUpload } from 'src/core/shared/components/ui/file-upload';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'src/core/shared/components/ui/form';
import { Input } from 'src/core/shared/components/ui/input';
import { MarkdownEditor } from 'src/core/shared/components/ui/markdown-editor';
import { Textarea } from 'src/core/shared/components/ui/textarea';
import {
  useCreateContextSource,
  useCreateContextUploadUrl,
  type ContextSourceKind,
} from '../hooks/use-context-sources';

// ─── File ────────────────────────────────────────────────────────────────────

const fileSchema = z.object({
  displayName: z.string().trim().max(255).optional(),
  description: z.string().trim().max(1000).optional(),
});
type FileValues = z.infer<typeof fileSchema>;

function FileForm({
  orgId,
  onSuccess,
  onCancel,
}: {
  orgId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const createUploadUrl = useCreateContextUploadUrl(orgId);
  const createSource = useCreateContextSource(orgId);

  const form = useForm<FileValues>({
    resolver: zodResolver(fileSchema),
    mode: 'onBlur',
    defaultValues: { displayName: '', description: '' },
  });

  async function onSubmit(values: FileValues) {
    if (!file) {
      setFileError('Selecione um arquivo');
      return;
    }
    const title = (values.displayName?.trim() || file.name).replace(/\.[^.]+$/, '') || file.name;
    const { uploadUrl, objectKey, publicUrl } = await createUploadUrl.mutateAsync({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    });
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
    await createSource.mutateAsync({
      title,
      description: values.description?.trim() || undefined,
      sourceKind: 'file',
      fileName: file.name,
      mimeType: file.type || undefined,
      fileSize: file.size,
      objectKey,
      publicUrl: publicUrl ?? undefined,
    });
    onSuccess();
  }

  const isLoading = createUploadUrl.isPending || createSource.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormItem>
          <FormLabel required>Arquivo</FormLabel>
          <FormControl>
            <FileUpload
              value={file}
              onChange={(f) => { setFile(f); setFileError(''); }}
              accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx"
            />
          </FormControl>
          {fileError && <p className="text-[12px] text-[var(--danger)]">{fileError}</p>}
        </FormItem>

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome <span className="text-[var(--fg-quaternary)]">(opcional)</span></FormLabel>
              <FormControl>
                <Input placeholder={file?.name.replace(/\.[^.]+$/, '') || 'Nome do arquivo'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição <span className="text-[var(--fg-quaternary)]">(opcional)</span></FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Sobre o que é este arquivo e como deve ser usado…"
                  {...field}
                />
              </FormControl>
              <FormDescription>Aparece como contexto no artefato gerado.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enviando…' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ─── URL ─────────────────────────────────────────────────────────────────────

const urlSchema = z.object({
  url: z.string().url('URL inválida').min(1, 'URL obrigatória'),
  title: z.string().trim().max(255).optional(),
  description: z.string().trim().max(1000).optional(),
});
type UrlValues = z.infer<typeof urlSchema>;

function UrlForm({
  orgId,
  onSuccess,
  onCancel,
}: {
  orgId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createSource = useCreateContextSource(orgId);

  const form = useForm<UrlValues>({
    resolver: zodResolver(urlSchema),
    mode: 'onBlur',
    defaultValues: { url: '', title: '', description: '' },
  });

  async function onSubmit(values: UrlValues) {
    let autoTitle: string;
    try {
      const u = new URL(values.url);
      autoTitle = u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      autoTitle = values.url;
    }
    const title = values.title?.trim() || autoTitle;
    await createSource.mutateAsync({
      title,
      description: values.description?.trim() || undefined,
      sourceKind: 'url',
      sourceUrl: values.url,
    });
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>URL de referência</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://…" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome <span className="text-[var(--fg-quaternary)]">(opcional)</span></FormLabel>
              <FormControl>
                <Input placeholder="Ex: Site institucional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição <span className="text-[var(--fg-quaternary)]">(opcional)</span></FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="O que esta URL representa e como deve ser usada…"
                  {...field}
                />
              </FormControl>
              <FormDescription>Aparece como contexto no artefato gerado.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={createSource.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createSource.isPending}>
            {createSource.isPending ? 'Adicionando…' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ─── Manual ──────────────────────────────────────────────────────────────────

const manualSchema = z.object({
  title: z.string().trim().min(1, 'Título obrigatório').max(255),
  content: z.string().trim().min(1, 'Conteúdo obrigatório'),
});
type ManualValues = z.infer<typeof manualSchema>;

function ManualForm({
  orgId,
  onSuccess,
  onCancel,
}: {
  orgId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createSource = useCreateContextSource(orgId);

  const form = useForm<ManualValues>({
    resolver: zodResolver(manualSchema),
    mode: 'onBlur',
    defaultValues: { title: '', content: '' },
  });

  async function onSubmit(values: ManualValues) {
    await createSource.mutateAsync({
      title: values.title,
      sourceKind: 'manual',
      description: values.content,
    });
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Guia de tom de voz" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel required>Conteúdo</FormLabel>
              <FormControl>
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Escreva o conteúdo em markdown…"
                  rows={8}
                  aria-invalid={fieldState.invalid}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={createSource.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createSource.isPending}>
            {createSource.isPending ? 'Salvando…' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ─── Dialog shell ─────────────────────────────────────────────────────────────

const KIND_TITLE: Record<ContextSourceKind, string> = {
  file: 'Adicionar arquivo',
  url: 'Adicionar URL',
  manual: 'Conteúdo manual',
};

type Props = {
  orgId: string | null;
  kind: ContextSourceKind | null;
  onOpenChange: (open: boolean) => void;
};

export function AddContextSourceDialog({ orgId, kind, onOpenChange }: Props) {
  function handleSuccess() {
    onOpenChange(false);
  }

  return (
    <Dialog open={kind !== null} onOpenChange={onOpenChange}>
      <DialogContent className={kind === 'manual' ? 'sm:max-w-2xl' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle>{kind ? KIND_TITLE[kind] : ''}</DialogTitle>
        </DialogHeader>

        {kind === 'file' && (
          <FileForm orgId={orgId} onSuccess={handleSuccess} onCancel={() => onOpenChange(false)} />
        )}
        {kind === 'url' && (
          <UrlForm orgId={orgId} onSuccess={handleSuccess} onCancel={() => onOpenChange(false)} />
        )}
        {kind === 'manual' && (
          <ManualForm orgId={orgId} onSuccess={handleSuccess} onCancel={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
