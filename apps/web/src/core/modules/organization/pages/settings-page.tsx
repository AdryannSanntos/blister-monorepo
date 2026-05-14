"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { useOrganizationMembers } from "src/core/modules/organization/hooks/use-members";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "src/core/shared/components/ui/alert-dialog";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { apiClient } from "src/core/shared/utils/api-client";
import { authClient } from "src/core/shared/utils/auth-client";

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

const generalFormSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(120, "Nome deve ter no máximo 120 caracteres"),
  slug: z
    .string()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(64, "Slug deve ter no máximo 64 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  logo: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("")),
});

type GeneralFormValues = z.infer<typeof generalFormSchema>;

type GeneralSettingsCardProps = {
  orgId: string;
  org: OrgDetail;
};

function GeneralSettingsCard({ orgId, org }: GeneralSettingsCardProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? "",
    },
  });

  // Sync form when org data changes
  useEffect(() => {
    form.reset({
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? "",
    });
  }, [org, form]);

  async function onSubmit(values: GeneralFormValues) {
    setIsSaving(true);
    try {
      await apiClient.patch(`/organizations/${orgId}`, {
        name: values.name,
        slug: values.slug,
        ...(values.logo ? { logo: values.logo } : {}),
      });
      await queryClient.invalidateQueries({
        queryKey: ["organization-detail", orgId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });
      toast.success("Configurações salvas com sucesso.");
    } catch {
      toast.error("Erro ao salvar configurações. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardHeader className="p-6">
        <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
          Configurações gerais
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da organização</FormLabel>
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
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="acme-corp" {...field} />
                  </FormControl>
                  <FormDescription>
                    Identificador único da organização. Use apenas letras minúsculas, números e hífens.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do logotipo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://exemplo.com/logo.png"
                      type="url"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Opcional. URL pública da imagem.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PermissionGate permission="company.update">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </PermissionGate>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

type TransferOwnershipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentUserId: string;
};

function TransferOwnershipDialog({
  open,
  onOpenChange,
  orgId,
  currentUserId,
}: TransferOwnershipDialogProps) {
  const queryClient = useQueryClient();
  const { data: members = [] } = useOrganizationMembers(orgId);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  const otherMembers = members.filter((m) => m.userId !== currentUserId);

  async function handleTransfer() {
    if (!selectedUserId) return;
    setIsTransferring(true);
    try {
      await apiClient.post(`/organizations/${orgId}/transfer`, {
        toUserId: selectedUserId,
      });
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({
        queryKey: ["organization-detail", orgId],
      });
      toast.success("Ownership transferido com sucesso.");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao transferir ownership. Tente novamente.");
    } finally {
      setIsTransferring(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Transferir ownership</AlertDialogTitle>
          <AlertDialogDescription>
            Selecione o membro que receberá o ownership deste workspace. Você
            perderá seus privilégios de owner após a transferência.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Select
            value={selectedUserId}
            onValueChange={setSelectedUserId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um membro" />
            </SelectTrigger>
            <SelectContent>
              {otherMembers.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.user.name ?? m.user.email}
                </SelectItem>
              ))}
              {otherMembers.length === 0 && (
                <SelectItem value="__empty__" disabled>
                  Nenhum outro membro
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleTransfer}
            disabled={!selectedUserId || isTransferring}
          >
            {isTransferring ? "Transferindo..." : "Confirmar transferência"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type DeleteWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
};

function DeleteWorkspaceDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
}: DeleteWorkspaceDialogProps) {
  const router = useRouter();
  const { clearActiveOrg } = useActiveOrganization();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = confirmText === orgName;

  async function handleDelete() {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/organizations/${orgId}`);
      clearActiveOrg();
      toast.success("Workspace excluído com sucesso.");
      router.push("/workspace/select");
    } catch {
      toast.error("Erro ao excluir workspace. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setConfirmText("");
    onOpenChange(nextOpen);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir workspace</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é permanente e não pode ser desfeita. Todos os dados do
            workspace serão excluídos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-[13px] text-[var(--fg-secondary)]">
            Para confirmar, digite{" "}
            <strong className="text-[var(--fg-primary)]">{orgName}</strong>:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={orgName}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleOpenChange(false)}>
            Cancelar
          </AlertDialogCancel>
          <Button
            className="bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir workspace"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SettingsPage() {
  const { activeOrgId } = useActiveOrganization();
  const { data: session } = authClient.useSession();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: org, isLoading } = useQuery<OrgDetail>({
    queryKey: ["organization-detail", activeOrgId],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgDetail>(
        `/organizations/${activeOrgId}`,
      );
      return data;
    },
    enabled: Boolean(activeOrgId),
  });

  if (isLoading || !org || !activeOrgId) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const currentUserId = session?.user?.id ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg-primary)]">
          Configurações
        </h1>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Gerencie as configurações gerais do workspace.
        </p>
      </div>

      <GeneralSettingsCard orgId={activeOrgId} org={org} />

      {/* Danger Zone */}
      <Card className="border-[var(--danger)]/40 bg-[var(--bg-base)]">
        <CardHeader className="p-6">
          <CardTitle className="text-[16px] font-medium text-[var(--danger)]">
            Zona de perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6 pt-0">
          {/* Transfer Ownership */}
          <div className="flex items-start justify-between gap-4 rounded-[var(--r-md)] border border-[var(--line-default)] p-4">
            <div>
              <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                Transferir ownership
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
                Transfira o controle do workspace para outro membro.
              </p>
            </div>
            <PermissionGate permission="company.delete">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferDialogOpen(true)}
              >
                Transferir ownership
              </Button>
            </PermissionGate>
          </div>

          {/* Delete Workspace */}
          <div className="flex items-start justify-between gap-4 rounded-[var(--r-md)] border border-[var(--danger)]/30 bg-[color-mix(in_oklch,var(--danger)_4%,transparent)] p-4">
            <div>
              <p className="text-[13px] font-medium text-[var(--danger)]">
                Deletar workspace
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
                Exclui permanentemente o workspace e todos os seus dados.
              </p>
            </div>
            <PermissionGate permission="company.delete">
              <Button
                variant="outline"
                size="sm"
                className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] hover:text-[var(--danger)]"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Deletar workspace
              </Button>
            </PermissionGate>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TransferOwnershipDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        orgId={activeOrgId}
        currentUserId={currentUserId}
      />

      <DeleteWorkspaceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        orgId={activeOrgId}
        orgName={org.name}
      />
    </div>
  );
}
