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
  type AIProvider,
  useCreateProvider,
  useUpdateProvider,
} from "../hooks/use-ai-catalog";

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "disabled"]),
});

type Values = z.infer<typeof schema>;

export function ProviderDialog({
  open,
  onOpenChange,
  provider,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: AIProvider | null;
}) {
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    values: {
      slug: provider?.slug ?? "",
      name: provider?.name ?? "",
      description: provider?.description ?? "",
      status: provider?.status ?? "draft",
    },
  });

  async function onSubmit(values: Values) {
    const payload = {
      ...values,
      iconMetadata: provider?.iconMetadata ?? {},
      capabilityMetadata: provider?.capabilityMetadata ?? {},
      pricingMetadata: provider?.pricingMetadata ?? {},
      limitsMetadata: provider?.limitsMetadata ?? {},
      schemaMetadata: provider?.schemaMetadata ?? { adapter: values.slug },
    };
    if (provider) {
      await updateProvider.mutateAsync({ providerId: provider.id, ...payload });
    } else {
      await createProvider.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {provider ? "Editar provider" : "Novo provider"}
          </DialogTitle>
          <DialogDescription>
            Defina o catálogo base do provider e seu status operacional.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {(["slug", "name", "description"] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required={name !== "description"}>
                      {name}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
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
                disabled={createProvider.isPending || updateProvider.isPending}
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
