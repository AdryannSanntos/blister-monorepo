"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Building2, Check, Copy } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { apiClient } from "src/core/shared/utils/api-client";

const createCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  ownerEmail: z.string().email("Email inválido"),
  ownerName: z.string().min(2).optional().or(z.literal("")),
});

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;

type CreateCompanyResult = {
  company: { id: string; name: string };
  owner: { id: string; email: string; name: string };
  firstAccessUrl?: string;
};

async function createCompany(data: CreateCompanyFormValues) {
  const { data: result } = await apiClient.post<CreateCompanyResult>(
    "/admin/companies",
    {
      name: data.name,
      ownerEmail: data.ownerEmail,
      ...(data.ownerName ? { ownerName: data.ownerName } : {}),
    },
  );
  return result;
}

export function CompaniesAdminTab() {
  const [createdInvite, setCreatedInvite] = useState<CreateCompanyResult | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      ownerEmail: "",
      ownerName: "",
    },
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createCompany,
    onSuccess: (result) => {
      setCreatedInvite(result);
      setCopied(false);
      toast.success(
        `Empresa "${result.company.name}" criada. Email enviado para ${result.owner.email}.`,
      );
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Erro ao criar empresa.");
    },
  });

  const handleCopyLink = async () => {
    if (!createdInvite?.firstAccessUrl) return;

    await navigator.clipboard.writeText(createdInvite.firstAccessUrl);
    setCopied(true);
    toast.success("Link copiado.");
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5" />
            <CardTitle>Criar Nova Empresa</CardTitle>
          </div>
          <CardDescription>
            Cria a empresa e envia um email de primeiro acesso para o
            responsável.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutateAsync(data))}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da empresa *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Ltda" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do responsável (owner) *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="owner@empresa.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do responsável (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Criando..." : "Criar empresa e enviar convite"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {createdInvite?.firstAccessUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Link de primeiro acesso</CardTitle>
            <CardDescription>
              Envie este link para {createdInvite.owner.email} caso o email não
              chegue. Expira em 1 hora.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              readOnly
              value={createdInvite.firstAccessUrl}
              aria-label="Link de primeiro acesso"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={handleCopyLink}>
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreatedInvite(null)}
              >
                Fechar
              </Button>
            </div>
            <Paragraph size="p6" tone="tertiary">
              Empresa: {createdInvite.company.name}
            </Paragraph>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
