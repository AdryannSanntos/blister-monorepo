# Tables + Member Restrictions + Account Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar exibição de dados em tabelas (90% rule), restringir a sidebar do role member apenas a Dashboard e Configurações da conta, e criar a página de Configurações da conta acessível pelo avatar.

**Architecture:** Quatro tarefas independentes: (1) documentar a regra de tabelas em skills e CLAUDE.md; (2) converter permissions-page de cards para TanStack Table; (3) adicionar `permission` a todos os itens de sidebar e filtrar grupos vazios; (4) criar página `/dashboard/account/settings` com atualização de perfil via better-auth client.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Table, shadcn/ui, better-auth client (`updateUser`, `changePassword`), React Hook Form + Zod, Tailwind tokens semânticos.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `CLAUDE.md` | Modificar | Adicionar Regra 8 — tabela para dados |
| `.claude/skills/company-os-frontend/SKILL.md` | Modificar | Expandir padrão de tabelas com regra 90% |
| `.claude/skills/company-os-design/SKILL.md` | Modificar | Adicionar seção Exibição de dados |
| `apps/web/src/core/modules/organization/pages/permissions-page.tsx` | Modificar | Converter cards de roles para TanStack Table |
| `apps/web/src/core/shared/components/ui/app-sidebar.tsx` | Modificar | Filtrar grupos sem itens visíveis |
| `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx` | Modificar | Adicionar `permission` a todos itens; link conta no dropdown do avatar |
| `apps/web/src/app/dashboard/account/settings/page.tsx` | Criar | Rota Next.js App Router |
| `apps/web/src/core/modules/account/pages/account-settings-page.tsx` | Criar | Componente de página (perfil + senha) |
| `apps/web/src/core/modules/account/hooks/use-account.ts` | Criar | Mutations de updateUser e changePassword |

---

## Task 1: Documentar a Regra de Tabelas

**Files:**
- Modify: `CLAUDE.md`
- Modify: `/Users/adryansantos/.claude/skills/company-os-frontend/SKILL.md`
- Modify: `/Users/adryansantos/.claude/skills/company-os-design/SKILL.md`

- [ ] **Step 1: Adicionar Regra 8 no CLAUDE.md**

Após a `### 7. Roles de sistema são imutáveis` e antes da seção de habilidades disponíveis, inserir:

```markdown
### 8. Dados em tabela por padrão

Qualquer coleção de entidades de dados (membros, roles, convites, permissões, logs, execuções, etc.) **deve ser renderizada em tabela** usando TanStack Table + shadcn `<Table>`.

Exceções aceitas (devem ser justificadas):
- Pickers de navegação (selecionar workspace, onboarding step)
- Controles de formulário (radio groups, select dropdowns)
- Showcases visuais ou design system demos
- Cards com hierarquia visual intrínseca que uma tabela não capturaria

Se a dúvida existir, use tabela.
```

- [ ] **Step 2: Expandir seção de tabelas no company-os-frontend SKILL.md**

Localizar a seção `## Padrão de tabela operacional` e substituir pelo bloco expandido:

```markdown
## Padrão de tabela operacional

**Regra: 90% das exibições de dados usam TanStack Table.** Toda coleção de entidades (membros, roles, convites, permissões, execuções, logs, etc.) deve ser uma tabela. Exceções: pickers de navegação, controles de formulário, showcases visuais.

```tsx
// Padrão obrigatório para listas de entidades
const columns: ColumnDef<Role>[] = [
  {
    id: 'name',
    header: 'Nome',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-[var(--fg-primary)]">
          {row.original.name}
        </span>
        {row.original.isSystem && <Badge variant="secondary">Sistema</Badge>}
      </div>
    ),
  },
  {
    id: 'permissions',
    header: 'Permissões',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.permissions.slice(0, 3).map((p) => (
          <Badge key={p} variant="secondary" className="text-[11px]">{p}</Badge>
        ))}
        {row.original.permissions.length > 3 && (
          <Badge variant="secondary" className="text-[11px]">
            +{row.original.permissions.length - 3}
          </Badge>
        )}
      </div>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <PermissionGate permission="role.update">
        <DropdownMenu>...</DropdownMenu>
      </PermissionGate>
    ),
  },
];

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
});
```

Envolver sempre em:
```tsx
<div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
  <Table>...</Table>
</div>
```

Empty state dentro do `<TableBody>`:
```tsx
<TableRow>
  <TableCell colSpan={columns.length} className="h-24 text-center text-[var(--fg-tertiary)]">
    Nenhum registro encontrado.
  </TableCell>
</TableRow>
```
```

- [ ] **Step 3: Adicionar seção em company-os-design SKILL.md**

Após a seção que menciona `TanStack Table` (buscar por "TanStack Table para listas"), adicionar logo abaixo:

```markdown
### Regra de exibição de dados

**90% das coleções de entidades devem ser tabelas.** Nunca renderizar listas de dados como cards empilhados verticalmente quando uma tabela serve. Cards são aceitos para: navegação (workspace picker), onboarding, showcases visuais.

Estrutura obrigatória da tabela:
- Container: `overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]`
- Header cells: `text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--fg-quaternary)]`
- Body rows: `hover:bg-[var(--bg-hover)]` via TableRow variant
- Empty state: `h-24 text-center text-[var(--fg-tertiary)]` em cell com colSpan total
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git add /Users/adryansantos/.claude/skills/company-os-frontend/SKILL.md
git add /Users/adryansantos/.claude/skills/company-os-design/SKILL.md
git commit -m "docs: add 90% table rule to CLAUDE.md and skills"
```

---

## Task 2: Converter Permissions-Page para Tabela

**Files:**
- Modify: `apps/web/src/core/modules/organization/pages/permissions-page.tsx`

- [ ] **Step 1: Substituir imports de Card por imports de Table**

No topo de `permissions-page.tsx`, remover imports de `Card, CardContent, CardHeader, CardTitle` e adicionar imports de Table:

```tsx
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/core/shared/components/ui/table";
```

Manter: `Badge`, `Button`, `AlertDialog*`, `Dialog*`, `Form*`, `Input`, `Checkbox`, `PermissionGate`.
Remover: `Card`, `CardContent`, `CardHeader`, `CardTitle`.

- [ ] **Step 2: Substituir o bloco de render de roles por TanStack Table**

Localizar o bloco que começa com `{isLoading ? (` e vai até o fechamento do card mapping + empty state. Substituir por:

```tsx
{isLoading ? (
  <div className="flex h-40 items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
  </div>
) : (
  <RolesTable
    roles={roles}
    onEdit={(role) => setEditingRole(role)}
    onDelete={(role) => setRoleToDelete(role)}
    deleteIsPending={deleteRole.isPending}
  />
)}
```

- [ ] **Step 3: Adicionar o componente `RolesTable` acima de `PermissionsPage`**

Inserir antes da função `PermissionsPage`:

```tsx
type RolesTableProps = {
  roles: OrgRole[];
  onEdit: (role: OrgRole) => void;
  onDelete: (role: OrgRole) => void;
  deleteIsPending: boolean;
};

function RolesTable({ roles, onEdit, onDelete, deleteIsPending }: RolesTableProps) {
  const columns: ColumnDef<OrgRole>[] = [
    {
      id: "name",
      header: "Cargo",
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-raised)]">
              <Shield className="size-3.5 text-[var(--fg-tertiary)]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[var(--fg-primary)]">
                {role.name}
              </span>
              {role.isSystem && (
                <Badge variant="secondary" className="text-[11px]">
                  Sistema
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "permissions",
      header: "Permissões",
      cell: ({ row }) => {
        const perms = row.original.permissions;
        if (perms.length === 0) {
          return <span className="text-[12px] text-[var(--fg-tertiary)]">—</span>;
        }
        const visible = perms.slice(0, 4);
        const overflow = perms.length - visible.length;
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((perm) => (
              <Badge key={perm} variant="secondary" className="text-[11px]">
                {permissionLabel(perm as AppPermissionKey)}
              </Badge>
            ))}
            {overflow > 0 && (
              <Badge variant="secondary" className="text-[11px]">
                +{overflow}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const role = row.original;
        if (role.isSystem) return null;
        return (
          <div className="flex items-center justify-end gap-1">
            <PermissionGate permission="role.update">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Editar cargo"
                onClick={() => onEdit(role)}
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
                onClick={() => onDelete(role)}
                disabled={deleteIsPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </PermissionGate>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: roles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                Nenhum cargo criado ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Verificar typecheck**

```bash
pnpm --filter web typecheck
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/organization/pages/permissions-page.tsx
git commit -m "feat: convert roles display from cards to TanStack Table"
```

---

## Task 3: Restrições de Sidebar para o Role Member

**Files:**
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`
- Modify: `apps/web/src/core/shared/components/ui/app-sidebar.tsx`

**Contexto:** Member tem permissões: `company.read`, `brain.read`, `skill.read`, `skill.execute`, `output.read`. Não tem `company.update`. A meta é: member vê apenas Dashboard + Account Settings (que não requer permission de org).

- [ ] **Step 1: Adicionar `permission` a todos os itens de Inteligência, Conteúdo, Automações e Workspace no dashboard-shell.tsx**

Localizar `const sidebarGroups: SidebarGroupDef[]` e substituir pelo bloco completo:

```tsx
const sidebarGroups: SidebarGroupDef[] = [
  {
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        match: (p) => p === "/dashboard",
      },
    ],
  },
  {
    label: "Inteligência",
    items: [
      {
        label: "Brain",
        icon: Brain,
        href: "/onboarding",
        permission: "company.update" as const,
      },
      {
        label: "Agentes",
        icon: Shield,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Agentes"),
      },
      {
        label: "Templates",
        icon: LayoutTemplate,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Templates"),
      },
      {
        label: "Biblioteca de contexto",
        icon: BookOpen,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Biblioteca de contexto"),
      },
    ],
  },
  {
    label: "Conteúdo e Páginas",
    items: [
      {
        label: "Histórico de execuções",
        icon: Sparkles,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Histórico de execuções"),
      },
      {
        label: "Visuals",
        icon: FileImage,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Visuals"),
      },
      {
        label: "Pages",
        icon: FileText,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Pages"),
      },
      {
        label: "Campanhas",
        icon: Megaphone,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Campanhas"),
      },
    ],
  },
  {
    label: "Automações",
    items: [
      {
        label: "Automações",
        icon: Zap,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Automações"),
      },
      {
        label: "Execuções",
        icon: Workflow,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Execuções"),
      },
      {
        label: "Agenda",
        icon: CalendarDays,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Agenda"),
      },
      {
        label: "Alertas e relatórios",
        icon: Bell,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Alertas e relatórios"),
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        label: "Equipe",
        icon: Users,
        href: "/dashboard/workspace/team",
        permission: "member.read" as const,
        match: (p) =>
          p.startsWith("/dashboard/workspace/team") ||
          p.startsWith("/dashboard/invites"),
      },
      {
        label: "Permissões",
        icon: Shield,
        href: "/dashboard/workspace/permissions",
        permission: "role.read" as const,
        match: (p) => p.startsWith("/dashboard/workspace/permissions"),
      },
      {
        label: "Integrações",
        icon: PlugZap,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Integrações"),
      },
      {
        label: "Arquivos e assets",
        icon: FolderOpen,
        permission: "company.update" as const,
        onSelect: () => showComingSoon("Arquivos e assets"),
      },
      {
        label: "Configurações",
        icon: Settings,
        href: "/dashboard/workspace/settings",
        permission: "company.update" as const,
        match: (p) => p.startsWith("/dashboard/workspace/settings"),
      },
    ],
  },
];
```

- [ ] **Step 2: Filtrar grupos vazios no app-sidebar.tsx**

Localizar a linha `const filteredGroups = groups.map(...)` e adicionar o filtro logo depois:

```tsx
const filteredGroups = groups
  .map((g) => ({
    ...g,
    items: g.items.filter(canShowItem),
  }))
  .filter((g) => !g.label || g.items.length > 0);
```

O `.filter((g) => !g.label || g.items.length > 0)` garante que grupos sem label (Dashboard) sempre aparecem, e grupos com label só aparecem se tiverem ao menos um item visível.

- [ ] **Step 3: Verificar typecheck**

```bash
pnpm --filter web typecheck
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx
git add apps/web/src/core/shared/components/ui/app-sidebar.tsx
git commit -m "feat: restrict sidebar to permissions — member sees only Dashboard"
```

---

## Task 4: Página de Configurações da Conta

**Files:**
- Create: `apps/web/src/core/modules/account/hooks/use-account.ts`
- Create: `apps/web/src/core/modules/account/pages/account-settings-page.tsx`
- Create: `apps/web/src/app/dashboard/account/settings/page.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`

**Contexto:** better-auth client já tem `updateUser` e `changePassword` via proxy. Não precisa de novo endpoint NestJS.

- [ ] **Step 1: Criar hook use-account.ts**

Criar `apps/web/src/core/modules/account/hooks/use-account.ts`:

```ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "src/core/shared/utils/auth-client";

const proxyClient = authClient as unknown as Record<
  string,
  (...args: unknown[]) => Promise<{ data: unknown; error: { message?: string } | null }>
>;

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (payload: { name: string; image?: string }) => {
      const result = await proxyClient.updateUser(payload);
      if (result.error) throw new Error(result.error.message ?? "Erro ao atualizar perfil");
      return result.data;
    },
    onSuccess: () => toast.success("Perfil atualizado com sucesso."),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const result = await proxyClient.changePassword({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        revokeOtherSessions: false,
      });
      if (result.error) throw new Error(result.error.message ?? "Erro ao alterar senha");
      return result.data;
    },
    onSuccess: () => toast.success("Senha alterada com sucesso."),
    onError: (err: Error) => toast.error(err.message),
  });
}
```

- [ ] **Step 2: Criar account-settings-page.tsx**

Criar `apps/web/src/core/modules/account/pages/account-settings-page.tsx`:

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useChangePassword, useUpdateProfile } from "src/core/modules/account/hooks/use-account";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { authClient } from "src/core/shared/utils/auth-client";

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
  image: z.string().url("URL inválida").optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function AccountSettingsPage() {
  const { data: session } = authClient.useSession();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: { name: "", image: "" },
  });

  useEffect(() => {
    if (session?.user) {
      profileForm.reset({
        name: session.user.name ?? "",
        image: (session.user as { image?: string | null }).image ?? "",
      });
    }
  }, [session?.user, profileForm]);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onProfileSubmit(values: ProfileValues) {
    await updateProfile.mutateAsync({
      name: values.name,
      ...(values.image ? { image: values.image } : {}),
    });
  }

  async function onPasswordSubmit(values: PasswordValues) {
    await changePassword.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    passwordForm.reset();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg-primary)]">
          Configurações da conta
        </h1>
        <p className="mt-1 text-[13px] text-[var(--fg-tertiary)]">
          Gerencie seu perfil pessoal e segurança da conta.
        </p>
      </div>

      {/* Perfil */}
      <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
        <CardHeader className="p-6">
          <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do avatar</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://exemplo.com/avatar.png"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-1">
                <p className="mb-1 text-[12px] text-[var(--fg-tertiary)]">
                  Email: <span className="text-[var(--fg-secondary)]">{session?.user?.email}</span>
                </p>
              </div>
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Salvando..." : "Salvar perfil"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
        <CardHeader className="p-6">
          <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
            Alterar senha
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha atual</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Alterando..." : "Alterar senha"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Criar rota Next.js**

Criar `apps/web/src/app/dashboard/account/settings/page.tsx`:

```tsx
import { AccountSettingsPage } from "src/core/modules/account/pages/account-settings-page";

export default function Page() {
  return <AccountSettingsPage />;
}
```

- [ ] **Step 4: Adicionar link no dropdown do avatar em dashboard-shell.tsx**

Localizar o bloco do `userTrigger` dropdown que tem "Alternar tema" e "Sair". Adicionar item de Configurações da conta e o import de `User`:

Adicionar `User` aos imports do lucide-react:
```tsx
import { ..., User, ... } from "lucide-react";
```

Substituir `DropdownMenuContent` do user trigger por:
```tsx
<DropdownMenuContent side="top" align="end" className="w-56">
  <DropdownMenuItem onClick={() => router.push("/dashboard/account/settings")}>
    <User />
    Configurações da conta
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
    {theme === "dark" ? <Sun /> : <Moon />}
    Alternar tema
  </DropdownMenuItem>
  <DropdownMenuItem onClick={handleSignOut}>
    <LogOut />
    Sair
  </DropdownMenuItem>
</DropdownMenuContent>
```

Adicionar também no `getHeaderTitle`:
```tsx
if (pathname.startsWith("/dashboard/account/settings")) return "Configurações da conta";
```

- [ ] **Step 5: Verificar typecheck**

```bash
pnpm --filter web typecheck
```

Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core/modules/account/
git add apps/web/src/app/dashboard/account/
git add apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx
git commit -m "feat: add account settings page accessible from user avatar dropdown"
```

---

## Self-Review

**Spec coverage:**
- ✅ Regra 90% tabelas → Task 1 documenta em 3 lugares
- ✅ Roles em tabela → Task 2 converte permissions-page
- ✅ Member vê só Dashboard → Task 3 adiciona permission a todos itens, filtra grupos vazios
- ✅ Owner manage:all → já implementado na sessão anterior (isOwner flag em defineAbilityForPermissions)
- ✅ Página de conta → Task 4 cria rota, página, hook e link no dropdown

**Placeholder scan:** Nenhum TBD encontrado. Todos os code blocks são completos.

**Type consistency:**
- `OrgRole` usa `permissions: AppPermissionKey[]` (já corrigido na sessão anterior)
- `SidebarItemDef.permission?: AppPermissionKey` já existe no tipo
- `proxyClient` segue o padrão já usado no `auth-client.ts`
- `useUpdateProfile` e `useChangePassword` exportados do mesmo arquivo importados na página
