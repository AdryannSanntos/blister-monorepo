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
import { useAssignPlatformRole } from "../hooks/use-platform-admin";

const schema = z.object({
  userId: z.string().min(1, "Informe o userId"),
  role: z.enum(["platform_owner", "platform_admin"]),
});

type Values = z.infer<typeof schema>;

export function AdminRoleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const assignPlatformRole = useAssignPlatformRole();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { userId: "", role: "platform_admin" },
  });

  async function onSubmit(values: Values) {
    await assignPlatformRole.mutateAsync(values);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Atribuir role global</DialogTitle>
          <DialogDescription>
            Concede acesso ao admin de plataforma para o usuário informado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>User ID</FormLabel>
                  <FormControl>
                    <Input placeholder="user_123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Role</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-3 text-[14px]"
                      {...field}
                    >
                      <option value="platform_admin">platform_admin</option>
                      <option value="platform_owner">platform_owner</option>
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
              <Button type="submit" disabled={assignPlatformRole.isPending}>
                Conceder acesso
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
