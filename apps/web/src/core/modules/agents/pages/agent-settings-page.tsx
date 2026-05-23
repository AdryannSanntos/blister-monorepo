"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Bot, ChevronDown, Save, Settings2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  useArchiveAgent,
  useCompanyAgent,
  useUpdateAgent,
} from "src/core/modules/agents/hooks/use-agents";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { AgentContentLayout } from "src/core/shared/components/ui/agent-content-layout";
import { Button } from "src/core/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/core/shared/components/ui/collapsible";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
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
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export function AgentSettingsPage() {
  const router = useRouter();
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const agent = useCompanyAgent(orgId, agentId);
  const update = useUpdateAgent(orgId, agentId);
  const archive = useArchiveAgent(orgId);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (agent.data) {
      form.reset({
        name: agent.data.name,
        description: agent.data.description ?? "",
      });
    }
  }, [agent.data, form]);

  async function onSubmit(values: FormValues) {
    await update.mutateAsync({
      name: values.name,
      description: values.description?.trim() || undefined,
    });
  }

  return (
    <AgentContentLayout
      icon={Settings2}
      title="Configurações"
      subtitle="Ajuste o nome, descrição e estado do agente."
      contentClassName="min-h-0 w-full flex-1 overflow-y-auto px-6 py-6"
    >
      <div className="w-full space-y-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      rows={4}
                      placeholder="O que este agente faz, em uma linha..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Aparece para os usuários antes de iniciar uma conversa.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PermissionGate permission="agent.update">
              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending}>
                  <Save className="size-3.5" />
                  {update.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </PermissionGate>
          </form>
        </Form>

        <PermissionGate permission="agent.delete">
          <Collapsible className="rounded-[var(--r-lg)] border border-[color-mix(in_oklch,var(--danger)_25%,transparent)] bg-[var(--bg-base)]">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <div>
                  <p className="text-[13px] font-medium text-[var(--danger)]">
                    Zona de perigo
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
                    Ações irreversíveis sobre o agente.
                  </p>
                </div>
                <ChevronDown className="size-4 text-[var(--fg-tertiary)] transition-transform [[data-state=open]_&]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 border-t border-[var(--line-subtle)] px-6 py-4">
                <p className="text-[12.5px] text-[var(--fg-tertiary)]">
                  Arquivar o agente remove ele da lista ativa e impede novas
                  execuções. Você poderá restaurar depois.
                </p>
                <Button
                  variant="destructive"
                  disabled={agent.data?.status === "archived"}
                  onClick={() => setConfirmArchive(true)}
                >
                  <Archive className="size-3.5" />
                  Arquivar agente
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </PermissionGate>
      </div>

      <ConfirmationDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Arquivar agente"
        description={
          <>
            O agente <strong>{agent.data?.name}</strong> será arquivado e não
            poderá receber novas execuções.
          </>
        }
        confirmLabel={archive.isPending ? "Arquivando..." : "Arquivar"}
        pending={archive.isPending}
        destructive
        onConfirm={async () => {
          await archive.mutateAsync(agentId);
          setConfirmArchive(false);
          router.push("/dashboard/workspace/agents");
        }}
      />
    </AgentContentLayout>
  );
}
