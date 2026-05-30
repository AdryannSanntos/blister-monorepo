"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useCreateAgent } from "src/core/modules/agents/hooks/use-agents";
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

const schema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
});

type FormValues = z.infer<typeof schema>;

function nameToSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
};

export function CreateAgentDialog({ open, onOpenChange, orgId }: Props) {
  const router = useRouter();
  const createAgent = useCreateAgent(orgId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { name: "" },
  });

  async function onSubmit(values: FormValues) {
    const slug = nameToSlug(values.name) || `agente-${Date.now()}`;
    const agent = await createAgent.mutateAsync({
      name: values.name,
      slug,
    });
    onOpenChange(false);
    form.reset();
    router.push(`/dashboard/workspace/agents/${agent.id}/onboarding`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar agente</DialogTitle>
          <DialogDescription>
            Dê um nome ao agente. Em seguida, configure objetivo, instruções e
            ferramentas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Gerador de copy"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Você pode mudar isso depois.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createAgent.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createAgent.isPending}>
                {createAgent.isPending ? "Criando..." : "Criar agente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
