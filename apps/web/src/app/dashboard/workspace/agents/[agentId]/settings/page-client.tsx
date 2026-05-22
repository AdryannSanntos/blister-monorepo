"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AgentWorkspacePage } from "src/core/modules/agents/pages/agent-workspace-page";
import {
  useCompanyAgent,
  useUpdateCompanyAgent,
} from "src/core/modules/agents/hooks/use-agents";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Button } from "src/core/shared/components/ui/button";
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
import { Textarea } from "src/core/shared/components/ui/textarea";

const settingsSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().max(500).optional(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export function AgentSettingsPageClient({ agentId }: { agentId: string }) {
  const { activeOrgId } = useActiveOrganization();
  const agent = useCompanyAgent(activeOrgId, agentId);
  const updateAgent = useUpdateCompanyAgent(activeOrgId, agentId);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    mode: "onBlur",
    values: agent.data
      ? {
          name: agent.data.name,
          description: agent.data.description ?? "",
        }
      : { name: "", description: "" },
  });

  async function onSubmit(values: SettingsValues) {
    await updateAgent.mutateAsync(values);
  }

  return (
    <AgentWorkspacePage agentId={agentId}>
      <div className="mx-auto max-w-2xl p-6">
        <h2 className="text-[15px] font-medium text-[var(--fg-primary)]">
          Configurações
        </h2>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Gerencie as informações e limites do agente.
        </p>

        <div className="mt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do agente" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        rows={3}
                        placeholder="Descreva o objetivo do agente."
                      />
                    </FormControl>
                    <FormDescription>Máximo de 500 caracteres.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <PermissionGate permission="agent.update">
                <Button type="submit" disabled={updateAgent.isPending}>
                  {updateAgent.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </PermissionGate>
            </form>
          </Form>
        </div>
      </div>
    </AgentWorkspacePage>
  );
}
