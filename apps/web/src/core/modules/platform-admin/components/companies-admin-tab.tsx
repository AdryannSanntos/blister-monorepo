"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
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
import { apiClient } from "src/core/shared/utils/api-client";

const createCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  ownerEmail: z.string().email("Email inválido"),
  ownerName: z.string().min(2).optional().or(z.literal("")),
});

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;

async function createCompany(data: CreateCompanyFormValues) {
  const { data: result } = await apiClient.post("/admin/companies", {
    name: data.name,
    ownerEmail: data.ownerEmail,
    ...(data.ownerName ? { ownerName: data.ownerName } : {}),
  });
  return result;
}

export function CompaniesAdminTab() {
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
      toast.success(
        `Empresa "${result.company.name}" criada. Email enviado para ${result.owner.email}.`,
      );
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Erro ao criar empresa.");
    },
  });

  return (
    <div className="mx-auto max-w-lg">
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
    </div>
  );
}
