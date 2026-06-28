"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BrandLogo } from "src/core/shared/components/brand-logo";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useUpdateProfile, useUserProfile } from "../hooks/use-user-profile";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z
    .string()
    .regex(cpfRegex, "CPF deve estar no formato 000.000.000-00")
    .optional()
    .or(z.literal("")),
  phone: z.string().min(10, "Telefone inválido").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function OnboardingProfileModal() {
  const { data: profile, isLoading } = useUserProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const isOpen = !isLoading && profile?.onboardingCompletedAt === null;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      name: profile?.name ?? "",
      cpf: "",
      phone: "",
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    try {
      await updateProfile({
        name: values.name,
        ...(values.cpf ? { cpf: values.cpf } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
      });
      toast.success("Perfil configurado com sucesso!");
    } catch {
      toast.error("Erro ao salvar perfil. Tente novamente.");
    }
  }

  if (isLoading || !isOpen) return null;

  return (
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 flex justify-center">
            <BrandLogo className="h-8 w-auto" />
          </div>
          <DialogTitle>Complete seu perfil</DialogTitle>
          <DialogDescription>
            Preencha suas informações para começar a usar a plataforma.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Começar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
