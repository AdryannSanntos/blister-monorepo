# Skill de Frontend — AI Company OS

Você é especialista em `apps/web` deste monorepo. Aplique as regras abaixo em toda implementação ou revisão de código frontend.

---

## Estrutura obrigatória

```
apps/web/src/
  app/                         ← rotas App Router
  core/
    modules/                   ← domínios (organization, auth, dashboard, onboarding...)
      <modulo>/
        pages/                 ← componentes de página ("use client")
        components/            ← componentes do módulo
        hooks/                 ← hooks de domínio (use-members, use-roles...)
    shared/
      components/
        ui/                    ← componentes shadcn (importar via @/core/shared/components/ui/...)
        permission-gate.tsx    ← PermissionGate
      utils/
        api-client.ts          ← instância axios
        auth-client.ts         ← better-auth client
```

## Regra de Permissão Universal no Frontend

Toda ação de escrita, exclusão ou dado restrito deve estar dentro de `<PermissionGate>`.

```tsx
<PermissionGate permission="member.invite">
  <Button onClick={() => setDialogOpen(true)}>Convidar membro</Button>
</PermissionGate>

<PermissionGate permission="company.update">
  <Button type="submit">Salvar</Button>
</PermissionGate>
```

Verificação programática:
```tsx
const { can, cannot, isLoading } = useAbility();
if (cannot('read', 'CompanyBrain')) return null;
```

## Hooks de domínio (obrigatório)

Toda chamada HTTP vive em hook de domínio com React Query — nunca fetch direto em página ou componente.

```tsx
export function useOrganizationMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ['members', orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<OrganizationMember[]>(
        `/organizations/${orgId}/members`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}
```

## Organização ativa

```tsx
const { activeOrgId } = useActiveOrganization();
// Sempre usar activeOrgId como contexto — NÃO assumir org na sessão better-auth
```

## Formulários (react-hook-form + Zod)

```tsx
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  mode: 'onBlur',
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Nome</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </form>
  </Form>
);
```

Nunca usar `DsField` em formulários reais — é apenas para showcase em `/design-system`.

## Tabelas operacionais (TanStack Table)

```tsx
const columns: ColumnDef<Member>[] = [
  { id: 'member', header: 'Membro', cell: ({ row }) => <MemberCell member={row.original} /> },
  {
    id: 'actions',
    cell: ({ row }) => (
      <PermissionGate permission="member.remove">
        <DropdownMenu>...</DropdownMenu>
      </PermissionGate>
    ),
  },
];
const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
```

Envolver em `rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]`.

## Estado

| Caso | Ferramenta |
|------|-----------|
| Dados de servidor | `useQuery` (React Query) |
| Mutações | `useMutation` (React Query) |
| Filtros/URL | `nuqs` |
| Estado local de UI | `useState` |
| Estado global sem servidor | `zustand` (último recurso) |

## Tokens obrigatórios

```tsx
// Correto
className="text-[var(--fg-primary)] bg-[var(--bg-base)] border-[var(--line-default)]"

// Errado
className="text-gray-900 bg-white border-gray-200"
```

Tokens principais: `--bg-canvas/base/raised/overlay/sunken/hover/active`, `--fg-primary/secondary/tertiary/quaternary`, `--accent`, `--success`, `--warning`, `--danger`, `--line-subtle/default/strong`

## Regras de componentes

- `Button` padrão `md`; dentro de card → `variant="ghost"`
- Raiz do `Card` sem padding — espaço em `CardHeader`, `CardContent`, `CardFooter`
- Três ou mais ações lado a lado → `DropdownMenu`
- Modais: header + content + footer separados
- Sem `dark:` utility — tokens são dark-default
- Ícones: `lucide-react` apenas, tamanho 16

## Integração auth

```tsx
// Sessão do usuário autenticado
const { data: session } = authClient.useSession();
const userId = session?.user?.id;

// NÃO usar session para org/roles — usar hooks de domínio
```

## Checklist de entrega

- [ ] Toda ação sensível dentro de `<PermissionGate permission="...">`
- [ ] Nenhuma chamada HTTP direta em page/component — usar hook de domínio
- [ ] `activeOrgId` de `useActiveOrganization()`, não de sessão better-auth
- [ ] Formulários com `Form` (RHF + Zod), `mode: 'onBlur'`
- [ ] Estado correto: React Query para servidor, nuqs para URL, useState para local
- [ ] Tokens de design system usados — sem cor raw
- [ ] Estrutura `core/modules` e `core/shared` respeitada
- [ ] Ícones de `lucide-react` apenas
- [ ] Sem `dark:` utility
