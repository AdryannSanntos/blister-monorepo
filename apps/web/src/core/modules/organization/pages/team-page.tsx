"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { useState } from "react";

import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import {
  type OrganizationMember,
  useOrganizationMembers,
  useRemoveMember,
} from "src/core/modules/organization/hooks/use-members";
import {
  type Invitation,
  useCancelInvitation,
  useInvitations,
} from "src/core/modules/organization/hooks/use-invitations";
import { useOrganizationRoles } from "src/core/modules/organization/hooks/use-roles";
import { CreateInviteDialog } from "src/core/modules/organization/components/create-invite-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "src/core/shared/components/ui/avatar";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
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
import { authClient } from "src/core/shared/utils/auth-client";

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
};

function MembersTable({ members, orgId }: MembersTableProps) {
  const removeMember = useRemoveMember(orgId);
  const [memberToRemove, setMemberToRemove] =
    useState<OrganizationMember | null>(null);

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
              <AvatarImage src={member.user.image ?? undefined} alt={member.user.name ?? member.user.email} />
              <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
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
        const { roles } = row.original;
        if (!roles || roles.length === 0) {
          return (
            <span className="text-[12px] text-[var(--fg-tertiary)]">—</span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <Badge key={r.id} variant="secondary">
                {r.role.name}
              </Badge>
            ))}
          </div>
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
          <PermissionGate permission="member.remove">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Ações">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-[var(--danger)]"
                  onClick={() => setMemberToRemove(member)}
                >
                  Remover membro
                </DropdownMenuItem>
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
                <TableRow key={row.id}>
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
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-[var(--fg-tertiary)]"
                >
                  Nenhum membro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
};

function InvitesTable({ invitations, orgId, roles }: InvitesTableProps) {
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
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-[var(--fg-tertiary)]"
              >
                Nenhum convite enviado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function TeamPage() {
  const { data: session } = authClient.useSession();
  const { activeOrgId } = useActiveOrganization();
  const { data: members = [], isLoading: membersLoading } =
    useOrganizationMembers(activeOrgId);
  const { data: invitations = [], isLoading: invitesLoading } =
    useInvitations(activeOrgId);
  const { data: roles = [] } = useOrganizationRoles(activeOrgId);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const inviterId = session?.user?.id ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--fg-primary)]">
            Equipe
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
            Gerencie os membros e convites do seu workspace.
          </p>
        </div>
        <PermissionGate permission="member.invite">
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="size-4" />
            Convidar membro
          </Button>
        </PermissionGate>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
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
            <MembersTable members={members} orgId={activeOrgId ?? ""} />
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
    </div>
  );
}
