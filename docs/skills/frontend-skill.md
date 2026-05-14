# Frontend Skill

## Objetivo

Guiar a implementação, refatoração ou revisão de código em `apps/web`.

## Ler Antes

- `docs/skills/project-engineering-skill.md`
- `docs/decisions/stack-decisions.md`
- `docs/design-system/usage-rules.md`

## Estrutura Obrigatória

```
apps/web/src/
  app/                         rotas App Router (page.tsx, layout.tsx)
  core/
    modules/                   domínios do produto
      <modulo>/
        pages/                 componentes de página ("use client")
        components/            componentes do módulo
        hooks/                 hooks de domínio com React Query
    shared/
      components/
        ui/                    componentes shadcn (importar via src/core/shared/components/ui/...)
        permission-gate.tsx    PermissionGate
      utils/
        api-client.ts          instância axios
        auth-client.ts         better-auth client
        query-client.ts        QueryClient singleton
```

## Regra de Permissão Universal

Toda ação de escrita, exclusão ou dado restrito deve estar dentro de `<PermissionGate>`:

```tsx
<PermissionGate permission="member.invite">
  <Button onClick={() => setDialogOpen(true)}>Convidar membro</Button>
</PermissionGate>

<PermissionGate permission="company.update">
  <Button type="submit">Salvar configurações</Button>
</PermissionGate>
```

Verificação programática via `useAbility()`:
```tsx
const { can, cannot, isLoading } = useAbility();
if (cannot('read', 'CompanyBrain')) return null;
{can('create', 'Member') && <InviteButton />}
```

## Hooks de Domínio (obrigatório)

Toda chamada HTTP vive em hook de domínio com React Query — nunca fetch direto em página/componente.

```tsx
// hooks/use-members.ts
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

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      apiClient.delete(`/organizations/${orgId}/members/${membershipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] });
      toast.success('Membro removido.');
    },
  });
}
```

## Organização Ativa

```tsx
const { activeOrgId } = useActiveOrganization();
// Sempre usar activeOrgId como contexto
// NUNCA assumir org a partir da sessão better-auth
```

## Formulários (react-hook-form + Zod)

```tsx
const schema = z.object({ name: z.string().min(2).max(120) });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  mode: 'onBlur',
  defaultValues: { name: '' },
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <PermissionGate permission="company.update">
        <Button type="submit">Salvar</Button>
      </PermissionGate>
    </form>
  </Form>
);
```

**Nunca usar `DsField` em formulários reais** — é primitivo de showcase da rota `/design-system`.

## Tabelas Operacionais

```tsx
const columns: ColumnDef<Member>[] = [
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

## Escolha de Estado

| Caso | Ferramenta |
|------|-----------|
| Dados de servidor (leitura) | `useQuery` (React Query) |
| Mutações de servidor | `useMutation` (React Query) |
| Filtros/paginação compartilháveis por URL | `nuqs` |
| Estado local temporário de UI | `useState` |
| Estado global de cliente sem servidor | `zustand` (só se useState não resolver) |

**TanStack Query não pode ser substituído por useState para dados de servidor.**

## Tokens de Design System (obrigatório)

```tsx
// Correto — tokens semânticos
className="text-[var(--fg-primary)] bg-[var(--bg-base)] border-[var(--line-default)]"

// Errado — cor raw
className="text-gray-900 bg-white border-gray-200"
```

Tokens principais: `--bg-canvas/base/raised/overlay/sunken/hover/active` · `--fg-primary/secondary/tertiary/quaternary` · `--accent` · `--success/warning/danger` · `--line-subtle/default/strong` · `--r-*` · `--dur-*`

## Regras de Componentes

- Importar de `src/core/shared/components/ui/`
- `Button` sem `size` → `md`; dashboards sempre `md`
- Controles dentro de card → `variant="ghost"`; fora → `variant="outline"` permitido
- Raiz do `Card` sem padding — espaço em `CardHeader`, `CardContent`, `CardFooter`
- Três ou mais ações lado a lado → `DropdownMenu`
- Modais: `DialogHeader` + conteúdo + `DialogFooter` separados
- Sem `dark:` utility — tokens são dark-default
- Ícones: `lucide-react` apenas, tamanho padrão 16

## Integração Auth

```tsx
// Sessão do usuário
const { data: session } = authClient.useSession();
const userId = session?.user?.id;
// NÃO usar session para org/roles — usar hooks de domínio
```

## Checklist de Entrega

- [ ] Toda ação sensível dentro de `<PermissionGate permission="...">`
- [ ] Nenhuma chamada HTTP direta em page/component — hook de domínio com React Query
- [ ] `activeOrgId` de `useActiveOrganization()`, não de sessão better-auth
- [ ] Formulários com `Form` (RHF + Zod), `mode: 'onBlur'`
- [ ] Estado correto: React Query para servidor, nuqs para URL, useState para local
- [ ] Tokens de design system usados — sem cor raw
- [ ] Estrutura `core/modules` e `core/shared` respeitada
- [ ] Nenhuma biblioteca concorrente de UI, formulário ou dados introduzida
- [ ] Ícones de `lucide-react` apenas
- [ ] Sem `dark:` utility
