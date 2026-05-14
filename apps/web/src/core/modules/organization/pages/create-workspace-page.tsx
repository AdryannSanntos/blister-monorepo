"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { authClient } from "src/core/shared/utils/auth-client";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(120, "Nome deve ter no máximo 120 caracteres"),
  slug: z
    .string()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(64, "Slug deve ter no máximo 64 caracteres")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug deve conter apenas letras minúsculas, números e hífens",
    ),
});

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function CreateWorkspacePage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const nameValue = form.watch("name");

  useEffect(() => {
    const generatedSlug = generateSlug(nameValue);
    form.setValue("slug", generatedSlug, { shouldValidate: false });
  }, [nameValue, form]);

  async function onSubmit(values: CreateWorkspaceFormValues) {
    if (!session?.user?.id) {
      toast.error("Você precisa estar autenticado para criar um workspace.");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/organizations", {
        userId: session.user.id,
        name: values.name,
        slug: values.slug,
      });

      toast.success("Workspace criado com sucesso!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message = error?.response?.data?.message ?? error?.message ?? "";

      if (
        message.toLowerCase().includes("slug") &&
        (message.toLowerCase().includes("taken") ||
          message.toLowerCase().includes("already") ||
          message.toLowerCase().includes("existe") ||
          message.toLowerCase().includes("conflict"))
      ) {
        toast.error("Este slug já está em uso. Escolha outro.");
        form.setError("slug", { message: "Este slug já está em uso." });
      } else {
        toast.error("Erro ao criar workspace. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar workspace</CardTitle>
        <CardDescription>
          Crie o espaço da sua empresa para começar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço do workspace</FormLabel>
                  <FormControl>
                    <div className="flex items-center rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-1">
                      <span className="select-none whitespace-nowrap border-r border-[var(--line-default)] px-3 py-2 text-sm text-[var(--fg-tertiary)]">
                        app.companyos.com/
                      </span>
                      <Input
                        {...field}
                        className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="minha-empresa"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Criando workspace..." : "Criar workspace"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
