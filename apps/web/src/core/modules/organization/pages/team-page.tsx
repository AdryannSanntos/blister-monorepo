"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  ChevronsUpDown,
  MoreHorizontal,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { CreateInviteDialog } from "src/core/modules/organization/components/create-invite-dialog";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import {
  type Invitation,
  useCancelInvitation,
  useInvitations,
} from "src/core/modules/organization/hooks/use-invitations";
import {
  type OrganizationMember,
  useActivateMember,
  useDeactivateMember,
  useOrganizationMembers,
  useRemoveMember,
  useUpdateMemberRoles,
} from "src/core/modules/organization/hooks/use-members";
import { useOrganizationRoles } from "src/core/modules/organization/hooks/use-roles";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "src/core/shared/components/ui/avatar";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "src/core/shared/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { TableEmptyState } from "src/core/shared/components/ui/empty-state";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/core/shared/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/core/shared/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/core/shared/components/ui/tabs";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { authClient } from "src/core/shared/utils/auth-client";
import { parseAsStringLiteral, useQueryState } from "nuqs";

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function invitationStatusLabel(status: Invitation["status"]): string {
  switch (status) {
    case "pending":
      return "Pendente";
    case "accepted":
      return "Aceito";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function invitationStatusVariant(
  status: Invitation["status"],
): "warning" | "success" | "secondary" {
  switch (status) {
    case "pending":
      return "warning";
    case "accepted":
      return "success";
    case "cancelled":
      return "secondary";
    default:
      return "secondary";
  }
}

type MembersTableProps = {
  members: OrganizationMember[];
  orgId: string;
  roles: { id: string; name: string }[];
  onInviteMember: () => void;
};

function MembersTable({
  members,
  orgId,
  roles,
  onInviteMember,
}: MembersTableProps) {
  const removeMember = useRemoveMember(orgId);
  const updateRoles = useUpdateMemberRoles(orgId);
  const deactivate = useDeactivateMember(orgId);
  const activate = useActivateMember(orgId);

  const [memberToRemove, setMemberToRemove] =
    useState<OrganizationMember | null>(null);
  const [memberToToggle, setMemberToToggle] =
    useState<OrganizationMember | null>(null);
  const [memberToEditRoles, setMemberToEditRoles] =
    useState<OrganizationMember | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [rolesPopoverOpen, setRolesPopoverOpen] = useState(false);

  function openEditRoles(member: OrganizationMember) {
    setSelectedRoleIds(member.roles.map((r) => r.roleId));
    setMemberToEditRoles(member);
    setRolesPopoverOpen(false);
  }

  function toggleRole(roleId: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  }

  function getRoleName(roleId: string): string {
    return roles.find((role) => role.id === roleId)?.name ?? roleId;
  }

  const columns: ColumnDef<OrganizationMember>[] = [
    {
      id: "member",
      header: "Membro",
      cell: ({ row }) => {
        const member = row.original;
        const initials = getInitials(member.user.name, member.user.email);
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage
                src={member.user.image ?? undefined}
                alt={member.user.name ?? member.user.email}
              />
              <AvatarFallback className="text-[11px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                {member.user.name ?? "—"}
              </p>
              <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
                {member.user.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "roles",
      header: "Cargos",
      cell: ({ row }) => {
        const { roles: memberRoles } = row.original;
        if (!memberRoles || memberRoles.length === 0) {
          return (
            <span className="text-[12px] text-[var(--fg-tertiary)]">—</span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {memberRoles.map((r) => (
              <Badge key={r.id} variant="secondary">
                {r.role.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const { active } = row.original;
        return active ? null : (
          <Badge
            variant="secondary"
            className="gap-1 text-[var(--fg-tertiary)]"
          >
            <UserX className="size-3" />
            Desativado
          </Badge>
        );
      },
    },
    {
      id: "joinedAt",
      header: "Entrou em",
      cell: ({ row }) => (
        <span className="text-[13px] text-[var(--fg-secondary)]">
          {formatDate(row.original.joinedAt ?? row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const member = row.original;
        return (
          <PermissionGate permission="member.update">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Ações">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditRoles(member)}>
                  Editar cargos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMemberToToggle(member)}>
                  {member.active ? (
                    <span className="flex items-center gap-2">
                      <UserX className="size-3.5" />
                      Desativar membro
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserCheck className="size-3.5" />
                      Reativar membro
                    </span>
                  )}
                </DropdownMenuItem>
                <PermissionGate permission="member.remove">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[var(--danger)]"
                    onClick={() => setMemberToRemove(member)}
                  >
                    Remover membro
                  </DropdownMenuItem>
                </PermissionGate>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
        );
      },
    },
  ];

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-inactive={!row.original.active || undefined}
                  className="data-[inactive]:opacity-60"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableEmptyState
                colSpan={columns.length}
                icon={Users}
                title="Nenhum membro encontrado"
                description="Os membros formam a equipe ativa do workspace e concentram acesso, contexto e execução operacional. Convide a primeira pessoa para começar a colaborar."
                action={
                  <PermissionGate permission="member.invite">
                    <Button onClick={onInviteMember}>
                      <UserPlus className="size-4" />
                      Convidar membro
                    </Button>
                  </PermissionGate>
                }
              />
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: editar cargos */}
      <Dialog
        open={Boolean(memberToEditRoles)}
        onOpenChange={(open) => !open && setMemberToEditRoles(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cargos</DialogTitle>
            <DialogDescription>
              Selecione os cargos de{" "}
              <strong>
                {memberToEditRoles?.user.name ?? memberToEditRoles?.user.email}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-[var(--fg-secondary)]">
                Cargos atribuídos
              </p>
              <Popover
                open={rolesPopoverOpen}
                onOpenChange={setRolesPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-auto min-h-11 w-full justify-between rounded-[var(--r-md)] border-[var(--line-default)] bg-[var(--bg-base)] px-3 py-2 text-left hover:bg-[var(--bg-hover)]"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                      {selectedRoleIds.length > 0 ? (
                        selectedRoleIds.map((roleId) => (
                          <Badge
                            key={roleId}
                            variant="secondary"
                            className="max-w-full truncate"
                          >
                            {getRoleName(roleId)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[13px] text-[var(--fg-tertiary)]">
                          Selecionar cargos...
                        </span>
                      )}
                    </div>
                    <ChevronsUpDown className="size-4 shrink-0 text-[var(--fg-tertiary)]" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] min-w-80 p-0"
                >
                  <Command className="bg-[var(--bg-overlay)]">
                    <CommandInput placeholder="Buscar cargo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cargo encontrado.</CommandEmpty>
                      {roles.map((role) => {
                        const isSelected = selectedRoleIds.includes(role.id);

                        return (
                          <CommandItem
                            key={role.id}
                            value={`${role.name} ${role.id}`}
                            onSelect={() => toggleRole(role.id)}
                            className="gap-3"
                          >
                            <span className="flex size-4 items-center justify-center">
                              {isSelected ? <Check className="size-4" /> : null}
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                                {role.name}
                              </span>
                              <span className="text-[11.5px] text-[var(--fg-tertiary)]">
                                {isSelected
                                  ? "Selecionado"
                                  : "Clique para adicionar"}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <p className="text-[12px] text-[var(--fg-tertiary)]">
              Escolha um ou mais cargos. Clique novamente em um cargo para
              removê-lo.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberToEditRoles(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={selectedRoleIds.length === 0 || updateRoles.isPending}
              onClick={async () => {
                if (!memberToEditRoles) return;
                await updateRoles.mutateAsync({
                  membershipId: memberToEditRoles.id,
                  roleIds: selectedRoleIds,
                });
                setMemberToEditRoles(null);
              }}
            >
              {updateRoles.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: desativar / reativar */}
      <AlertDialog
        open={Boolean(memberToToggle)}
        onOpenChange={(open) => !open && setMemberToToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToToggle?.active ? "Desativar membro" : "Reativar membro"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToToggle?.active
                ? `Desativar ${memberToToggle?.user.name ?? memberToToggle?.user.email} impedirá o acesso ao workspace, mas o histórico será preservado.`
                : `Reativar ${memberToToggle?.user.name ?? memberToToggle?.user.email} restaurará o acesso ao workspace.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!memberToToggle) return;
                if (memberToToggle.active) {
                  await deactivate.mutateAsync(memberToToggle.id);
                } else {
                  await activate.mutateAsync(memberToToggle.id);
                }
                setMemberToToggle(null);
              }}
              disabled={deactivate.isPending || activate.isPending}
            >
              {deactivate.isPending || activate.isPending
                ? "Salvando..."
                : memberToToggle?.active
                  ? "Desativar"
                  : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert: remover */}
      <AlertDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>
                {memberToRemove?.user.name ?? memberToRemove?.user.email}
              </strong>{" "}
              do workspace? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90"
              onClick={async () => {
                if (!memberToRemove) return;
                await removeMember.mutateAsync(memberToRemove.id);
                setMemberToRemove(null);
              }}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type InvitesTableProps = {
  invitations: Invitation[];
  orgId: string;
  roles: { id: string; name: string }[];
  onInviteMember: () => void;
};

function InvitesTable({
  invitations,
  orgId,
  roles,
  onInviteMember,
}: InvitesTableProps) {
  const cancelInvitation = useCancelInvitation(orgId);

  function getRoleName(roleId: string | null): string {
    if (!roleId) return "Padrão";
    return roles.find((r) => r.id === roleId)?.name ?? "Padrão";
  }

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.length ? (
            invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="text-[13px] text-[var(--fg-primary)]">
                  {inv.email}
                </TableCell>
                <TableCell>
                  <span className="text-[13px] text-[var(--fg-secondary)]">
                    {getRoleName(inv.roleId)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={invitationStatusVariant(inv.status)}>
                    {invitationStatusLabel(inv.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-[13px] text-[var(--fg-secondary)]">
                  {formatDate(inv.expiresAt)}
                </TableCell>
                <TableCell className="text-right">
                  {inv.status === "pending" && (
                    <PermissionGate permission="member.invite">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelInvitation.mutate(inv.id)}
                        disabled={cancelInvitation.isPending}
                      >
                        Cancelar
                      </Button>
                    </PermissionGate>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableEmptyState
              colSpan={5}
              icon={UserPlus}
              title="Nenhum convite enviado"
              description="Os convites ajudam a trazer novas pessoas para o workspace com rastreabilidade e controle de acesso desde o primeiro contato. Envie o primeiro quando quiser expandir a equipe."
              action={
                <PermissionGate permission="member.invite">
                  <Button onClick={onInviteMember}>
                    <UserPlus className="size-4" />
                    Enviar primeiro convite
                  </Button>
                </PermissionGate>
              }
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function TeamPage() {
  const { data: session } = authClient.useSession();
  const { activeOrgId } = useActiveOrganization();
  const { cannot, isLoading: abilityLoading } = useAbility();
  const { data: members = [], isLoading: membersLoading } =
    useOrganizationMembers(activeOrgId);
  const { data: invitations = [], isLoading: invitesLoading } =
    useInvitations(activeOrgId);
  const { data: roles = [] } = useOrganizationRoles(activeOrgId);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(["members", "invites"]).withDefault("members"));

  if (!abilityLoading && cannot("read", "Member")) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  const inviterId = session?.user?.id ?? "";

  return (
    <PageLayout
      eyebrow="Workspace"
      title="Equipe"
      description="Gerencie os membros e convites do workspace. Controle acesso, cargos e status de cada pessoa da equipe."
      actions={
        <PermissionGate permission="member.invite">
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="size-4" />
            Convidar membro
          </Button>
        </PermissionGate>
      }
    >
      <Tabs value={tab} onValueChange={(v) => void setTab(v as "members" | "invites")}>
        <TabsList variant="underline">
          <TabsTrigger value="members">
            Membros{" "}
            {!membersLoading && members.length > 0 && (
              <span className="ml-1.5 rounded-[var(--r-full)] bg-[var(--bg-hover)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--fg-tertiary)]">
                {members.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invites">
            Convites{" "}
            {!invitesLoading && invitations.length > 0 && (
              <span className="ml-1.5 rounded-[var(--r-full)] bg-[var(--bg-hover)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--fg-tertiary)]">
                {invitations.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          {membersLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <MembersTable
              members={members}
              orgId={activeOrgId ?? ""}
              roles={roles}
              onInviteMember={() => setInviteDialogOpen(true)}
            />
          )}
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          {invitesLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <InvitesTable
              invitations={invitations}
              orgId={activeOrgId ?? ""}
              roles={roles}
              onInviteMember={() => setInviteDialogOpen(true)}
            />
          )}
        </TabsContent>
      </Tabs>

      {activeOrgId && inviterId && (
        <CreateInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          orgId={activeOrgId}
          inviterId={inviterId}
        />
      )}
    </PageLayout>
  );
}
