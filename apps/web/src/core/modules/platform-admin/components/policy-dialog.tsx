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
  type AIProviderPolicy,
  useAIProviders,
  useUpsertPolicy,
} from "../hooks/use-ai-catalog";

const schema = z.object({
  organizationId: z.string().min(1),
  providerId: z.string().min(1),
  allowedModelIds: z.string().optional(),
  notes: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function PolicyDialog({
  open,
  onOpenChange,
  policy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: AIProviderPolicy | null;
}) {
  const providers = useAIProviders();
  const upsertPolicy = useUpsertPolicy();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    values: {
      organizationId: policy?.organizationId ?? "",
      providerId: policy?.providerId ?? "",
      allowedModelIds: policy?.allowedModelIds?.join(", ") ?? "",
      notes:
        typeof policy?.metadata?.notes === "string"
          ? policy.metadata.notes
          : "",
    },
  });

  async function onSubmit(values: Values) {
    await upsertPolicy.mutateAsync({
      organizationId: values.organizationId,
      providerId: values.providerId,
      allowedModelIds: values.allowedModelIds
        ? values.allowedModelIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
      metadata: { notes: values.notes ?? "", allowCompanyCredentials: true },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {policy ? "Editar política" : "Nova política"}
          </DialogTitle>
          <DialogDescription>
            Restringe modelos por empresa e define o escopo de BYOK.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Organization ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="allowedModelIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowed model IDs</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="model-a, model-b"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
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
              <Button type="submit" disabled={upsertPolicy.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
