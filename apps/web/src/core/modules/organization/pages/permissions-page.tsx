"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AppPermissionKey } from "@company-os/authz";
import { Edit2, Plus, Shield, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import {
  type OrgRole,
  useCreateRole,
  useDeleteRole,
  useOrganizationRoles,
  useUpdateRole,
} from "src/core/modules/organization/hooks/use-roles";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "src/core/shared/components/ui/alert-dialog";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
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
import { cn } from "src/core/shared/utils";

const PERMISSION_GROUPS: {
  label: string;
  permissions: AppPermissionKey[];
  destructive?: AppPermissionKey[];
}[] = [
  {
    label: "Empresa",
    permissions: ["company.read", "company.update", "company.delete"],
    destructive: ["company.delete"],
  },
  {
    label: "Membros",
    permissions: [
      "member.read",
      "member.invite",
      "member.update",
      "member.remove",
    ],
  },
  {
    label: "Cargos",
    permissions: [
      "role.read",
      "role.create",
      "role.update",
      "role.delete",
    ],
    destructive: ["role.delete"],
  },
  {
    label: "Brain",
    permissions: ["brain.read", "brain.update"],
  },
  {
    label: "Skills & Outputs",
    permissions: [
      "skill.read",
      "skill.execute",
      "output.read",
      "output.review",
    ],
  },
];

function permissionLabel(key: AppPermissionKey): string {
  const labels: Record<string, string> = {
    "company.read": "Visualizar empresa",
    "company.update": "Editar empresa",
    "company.delete": "Deletar empresa",
    "member.read": "Visualizar membros",
    "member.invite": "Convidar membros",
    "member.update": "Editar membros",
    "member.remove": "Remover membros",
    "role.read": "Visualizar cargos",
    "role.create": "Criar cargos",
    "role.update": "Editar cargos",
    "role.delete": "Deletar cargos",
    "brain.read": "Visualizar brain",
    "brain.update": "Editar brain",
    "skill.read": "Visualizar skills",
    "skill.execute": "Executar skills",
    "output.read": "Visualizar outputs",
    "output.review": "Revisar outputs",
  };
  return labels[key] ?? key;
}

const roleFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  permissions: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

type RoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  role?: OrgRole;
};

function RoleDialog({ open, onOpenChange, orgId, role }: RoleDialogProps) {
  const createRole = useCreateRole(orgId);
  const updateRole = useUpdateRole(orgId);
  const isEdit = Boolean(role);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: role?.name ?? "",
      permissions: role?.permissions ?? [],
    },
  });

  // Reset form when role changes (switching from create to edit)
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ name: "", permissions: [] });
    } else if (role) {
      form.reset({ name: role.name, permissions: role.permissions });
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: RoleFormValues) {
    try {
      const permissions = values.permissions as AppPermissionKey[];
      if (isEdit && role) {
        await updateRole.mutateAsync({
          roleId: role.id,
          name: values.name,
          permissions,
        });
      } else {
        await createRole.mutateAsync({ name: values.name, permissions });
      }
      handleOpenChange(false);
    } catch {
      // handled by hook
    }
  }

  const isPending = createRole.isPending || updateRole.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cargo" : "Criar cargo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize o nome e as permissões deste cargo."
              : "Defina o nome e as permissões do novo cargo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Editor de conteúdo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissões</FormLabel>
                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.label}>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                          {group.label}
                        </p>
                        <div className="space-y-2">
                          {group.permissions.map((perm) => {
                            const isDestructive =
                              group.destructive?.includes(perm);
                            return (
                              <div
                                key={perm}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={perm}
                                  checked={field.value.includes(perm)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([
                                        ...field.value,
                                        perm,
                                      ]);
                                    } else {
                                      field.onChange(
                                        field.value.filter(
                                          (p) => p !== perm,
                                        ),
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={perm}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-1.5 text-[13px]",
                                    isDestructive
                                      ? "text-[var(--danger)]"
                                      : "text-[var(--fg-secondary)]",
                                  )}
                                >
                                  {permissionLabel(perm)}
                                  {isDestructive && (
                                    <TriangleAlert className="size-3 shrink-0 text-[var(--warning)]" />
                                  )}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Salvando..."
                  : isEdit
                    ? "Salvar alterações"
                    : "Criar cargo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function PermissionsPage() {
  const { activeOrgId } = useActiveOrganization();
  const { data: roles = [], isLoading } = useOrganizationRoles(activeOrgId);
  const deleteRole = useDeleteRole(activeOrgId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<OrgRole | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--fg-primary)]">
            Permissões
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
            Gerencie os cargos e permissões do workspace.
          </p>
        </div>
        <PermissionGate permission="role.create">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" />
            Criar cargo
          </Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <Card
              key={role.id}
              className="border-[var(--line-default)] bg-[var(--bg-base)]"
            >
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-raised)]">
                  <Shield className="size-4 text-[var(--fg-tertiary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-[14px] font-medium text-[var(--fg-primary)]">
                      {role.name}
                    </CardTitle>
                    {role.isSystem && (
                      <Badge variant="secondary">Sistema</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
                    {role.permissions.length} permiss
                    {role.permissions.length === 1 ? "ão" : "ões"}
                  </p>
                </div>

                {!role.isSystem && (
                  <div className="flex items-center gap-1">
                    <PermissionGate permission="role.update">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar cargo"
                        onClick={() => setEditingRole(role)}
                      >
                        <Edit2 className="size-4" />
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="role.delete">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Deletar cargo"
                        className="text-[var(--danger)] hover:text-[var(--danger)]"
                        onClick={() => setRoleToDelete(role)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </PermissionGate>
                  </div>
                )}
              </CardHeader>

              {role.permissions.length > 0 && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((perm) => (
                      <Badge
                        key={perm}
                        variant="secondary"
                        className="text-[11px]"
                      >
                        {permissionLabel(perm as AppPermissionKey)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {roles.length === 0 && (
            <div className="flex h-40 items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[var(--line-default)]">
              <p className="text-[13px] text-[var(--fg-tertiary)]">
                Nenhum cargo criado ainda.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      {activeOrgId && (
        <RoleDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          orgId={activeOrgId}
        />
      )}

      {/* Edit Dialog */}
      {activeOrgId && editingRole && (
        <RoleDialog
          open={Boolean(editingRole)}
          onOpenChange={(open) => !open && setEditingRole(null)}
          orgId={activeOrgId}
          role={editingRole}
        />
      )}

      {/* Delete Alert */}
      <AlertDialog
        open={Boolean(roleToDelete)}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo{" "}
              <strong>{roleToDelete?.name}</strong>? Membros sem outros
              cargos perderão acesso ao workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90"
              onClick={async () => {
                if (!roleToDelete) return;
                await deleteRole.mutateAsync(roleToDelete.id);
                setRoleToDelete(null);
              }}
              disabled={deleteRole.isPending}
            >
              {deleteRole.isPending ? "Excluindo..." : "Excluir cargo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
