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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { z } from "zod";
import {
  type AIProviderPolicy,
  useAIProviders,
  useUpsertPolicy,
} from "../hooks/use-ai-catalog";
import { usePlatformOrganizations } from "../hooks/use-platform-admin";

const schema = z.object({
  organizationId: z.string().min(1, "Selecione uma empresa"),
  providerId: z.string().min(1, "Selecione um provider"),
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
  const organizations = usePlatformOrganizations();
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
                  <FormLabel required>Empresa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(organizations.data ?? []).map((organization) => (
                        <SelectItem key={organization.id} value={organization.id}>
                          {organization.name} ({organization.slug})
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
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(providers.data ?? []).map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
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
              name="allowedModelIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelos permitidos</FormLabel>
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
