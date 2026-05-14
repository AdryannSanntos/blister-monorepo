"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCreateInvitation } from "src/core/modules/organization/hooks/use-invitations";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { z } from "zod";

const inviteSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .min(1, "Email é obrigatório"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

type CreateInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  inviterId: string;
};

export function CreateInviteDialog({
  open,
  onOpenChange,
  orgId,
  inviterId,
}: CreateInviteDialogProps) {
  const createMutation = useCreateInvitation(orgId);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: InviteFormValues) {
    try {
      await createMutation.mutateAsync({ inviterId, email: values.email });
      form.reset();
      onOpenChange(false);
    } catch {
      // erro tratado no onError do hook
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            O convidado receberá um email com link para entrar no workspace. O convite expira em 7 dias.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="py-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do convidado</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="colega@empresa.com"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Certifique-se de que o email está correto antes de enviar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Enviando..." : "Enviar convite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
