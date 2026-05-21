"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { z } from "zod";
import {
  type AIModel,
  useAIProviders,
  useCreateModel,
  useUpdateModel,
} from "../hooks/use-ai-catalog";

const schema = z.object({
  providerId: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2),
  externalModelId: z.string().min(1),
  status: z.enum(["draft", "active", "deprecated", "disabled"]),
});

type Values = z.infer<typeof schema>;

export function ModelDialog({
  open,
  onOpenChange,
  model,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: AIModel | null;
}) {
  const providers = useAIProviders();
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    values: {
      providerId: model?.providerId ?? "",
      slug: model?.slug ?? "",
      name: model?.name ?? "",
      externalModelId: model?.externalModelId ?? "",
      status: model?.status ?? "draft",
    },
  });

  async function onSubmit(values: Values) {
    const payload = {
      ...values,
      description: model?.description ?? "",
      capabilityMetadata: model?.capabilityMetadata ?? {
        supportsTextGeneration: true,
      },
      pricingMetadata: model?.pricingMetadata ?? {},
      limitsMetadata: model?.limitsMetadata ?? {},
      schemaMetadata: model?.schemaMetadata ?? {},
    };
    if (model) {
      await updateModel.mutateAsync({ modelId: model.id, ...payload });
    } else {
      await createModel.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{model ? "Editar modelo" : "Novo modelo"}</DialogTitle>
          <DialogDescription>
            Cadastre o identificador do modelo e seu provider base.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Provider</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-3 text-[14px]"
                      {...field}
                    >
                      <option value="">Selecione</option>
                      {(providers.data ?? []).map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(["slug", "name", "externalModelId"] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{name}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Status</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-3 text-[14px]"
                      {...field}
                    >
                      <option value="draft">draft</option>
                      <option value="active">active</option>
                      <option value="deprecated">deprecated</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createModel.isPending || updateModel.isPending}
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
