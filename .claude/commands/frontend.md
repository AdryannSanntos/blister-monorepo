# Skill de Frontend — Blister

Você é especialista em `apps/web` deste monorepo. Aplique as regras abaixo em toda implementação ou revisão de código frontend.
Contexto técnico em `docs/project/architecture.md`.

> Produto: marketing IA. Rotas alvo: **superfície por agente**, campanhas (workspace), saldo créditos. **Sem** hub central `/pecas`. Linguagem operacional por agente — não "Gerar com IA" nem "peça". Ver `docs/decisions/2026-06-09-agents-isolated-architecture.md`.

---

## Regras de codificação (invioláveis)

| Regra | Obrigatório |
|-------|-------------|
| Validação | **Zod sempre** — schemas em `dto/`, `packages/types` e formulários |
| Dados de servidor | **TanStack Query** via hooks de domínio — nunca fetch em page/component |
| Formulários | **RHF + zodResolver** — sempre |
| Filtros / tabs / URL | **nuqs** — sempre que estado for compartilhável ou navegável |
| Componentes | Só em `core/modules/<modulo>/components/` (ou `core/shared/` se reutilizável) |
| Renderização | **Server Components por padrão**; `"use client"` só quando necessário; Server Actions quando couber |
| Estado global UI | **Zustand** quando precisar de estado global — não para dados de API |
| UX / design | **Playwright** — fluxos críticos e regressão visual/UX devem ter testes e2e |

---

## Estrutura obrigatória

```
apps/web/src/
  app/                         ← rotas App Router (auth/, dashboard/(shell)/, system/)
  core/
    modules/                   ← domínios (auth, dashboard, account, platform-admin, ...)
      <modulo>/
        pages/                 ← componentes de página ("use client")
        components/            ← componentes do módulo
        hooks/                 ← hooks de domínio (use-account, use-roles, ...)
    shared/
      components/
        ui/                    ← shadcn (importar via @/core/shared/components/ui/...)
        permission-gate.tsx    ← PermissionGate
      hooks/
        use-ability.ts         ← useAbility()
      utils/
        api-client.ts          ← instância axios
        auth-client.ts         ← better-auth client
```

## Regra de Permissão Universal no Frontend

Toda ação de escrita, exclusão ou dado restrito deve estar dentro de `<PermissionGate>`.

```tsx
import { PermissionGate } from '@/core/shared/components/permission-gate';

<PermissionGate permission="member.invite">
  <Button onClick={() => setDialogOpen(true)}>Convidar membro</Button>
</PermissionGate>

<PermissionGate permission="campaign.create">
  <Button type="submit">Nova campanha</Button>
</PermissionGate>
```

Verificação programática:
```tsx
import { useAbility } from '@/core/shared/hooks/use-ability';

const { can, cannot, isLoading } = useAbility();
if (cannot('read', 'User')) return null;
```

## Server Components e Server Actions

- Rotas em `app/` defaultam a **Server Component** — buscar dados no servidor quando possível.
- Extrair interatividade para `core/modules/<modulo>/pages/` ou `components/` com `"use client"`.
- Mutações simples podem usar **Server Actions**; dados subsequentes ainda via TanStack Query no client quando precisar de cache/revalidação.

```tsx
// app/dashboard/campanhas/page.tsx — Server Component
export default async function CampanhasPage() {
  return <CampanhasPageClient />;
}
```

## Organização de componentes

- **Proibido** criar componente em arquivo solto ou pasta fora do módulo.
- Feature → `core/modules/<modulo>/components/<nome>.tsx`
- Reutilizável cross-módulo → `core/shared/components/`
- Primitivos UI → `core/shared/components/ui/` (shadcn)

## nuqs (filtros, tabs, paginação)

Sempre que houver filtros, tabs, ordenação ou paginação refletidos na URL:

```tsx
import { parseAsString, useQueryState } from 'nuqs';

const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('todas'));
const [status, setStatus] = useQueryState('status', parseAsString);
```

Não usar `useState` isolado para estado que o usuário espera compartilhar via link ou voltar/avançar do browser.

## Hooks de domínio (obrigatório)

Toda chamada HTTP vive em hook de domínio com React Query — nunca fetch direto em página ou componente.

```tsx
export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get<Campaign[]>('/campaigns');
      return data;
    },
  });
}
```

## Sessão e identidade do usuário

```tsx
// Sessão do usuário autenticado
const { data: session } = authClient.useSession();
const userId = session?.user?.id;

// NÃO derivar userType/roles/permissões da sessão better-auth — usar hooks de domínio + useAbility()
```

## Formulários (react-hook-form + Zod — sempre)

Todo formulário usa RHF + Zod — sem exceção. Regra 9 — máximo de 2–3 campos para iniciar.

```tsx
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  mode: 'onBlur',
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField control={form.control} name="nome" render={({ field }) => (
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

## Tabelas operacionais (`<DataTable>` + TanStack Table)

Coleções de dados defaultam para `<DataTable>` (Regra 8) com sort, filtros, seleção, export e floating footer.

```tsx
const columns: ColumnDef<Campaign>[] = [
  { id: 'name', header: 'Campaign', enableSorting: true, cell: ({ row }) => row.original.name },
  {
    id: 'actions',
    cell: ({ row }) => (
      <PermissionGate permission="campaign.delete">
        <DropdownMenu>...</DropdownMenu>
      </PermissionGate>
    ),
  },
];
```

Filtros via prop `filters` (`DataTableFilter[]`); bulk actions/export habilitam seleção automaticamente.

## Estado

| Caso | Ferramenta |
|------|-----------|
| Dados de servidor | **TanStack Query** (`useQuery` / `useMutation`) — sempre |
| Filtros / tabs / URL | **nuqs** — sempre |
| Formulários | **RHF + Zod** — sempre |
| Estado local de UI | `useState` |
| Estado global de UI | **zustand** — quando necessário |
| Renderização | Server Components por padrão; client só quando necessário |

## Playwright (UX essencial)

Fluxos críticos (onboarding, criar post, revisão, campanhas) devem ter testes e2e Playwright validando:
- happy path completo
- estados vazio/erro/sem permissão quando aplicável
- layout e interações principais (tabs, filtros nuqs, modais, animações)

Novas features de UI devem incluir ou estender specs em `apps/web/e2e/` (ou pasta equivalente do projeto).

## Tokens obrigatórios

```tsx
// Correto
className="text-[var(--fg-primary)] bg-[var(--bg-base)] border-[var(--line-default)]"
// Errado
className="text-gray-900 bg-white border-gray-200"
```

## Regras de componentes

- `Button` padrão `md`; dentro de card → `variant="ghost"`
- Raiz do `Card` sem padding — espaço em `CardHeader/Content/Footer`
- Três ou mais ações lado a lado → `DropdownMenu`
- Modais: header + content + footer separados
- Sem `dark:` utility — tokens são dark-default
- Ícones: `lucide-react` apenas, tamanho 16
- Animações sempre presentes (`tw-animate-css`); espaçamento 24px/16px

## Checklist de entrega

- [ ] **Zod** em todo schema de formulário e contrato tipado
- [ ] **TanStack Query** em todo dado de servidor — hook de domínio, zero fetch em page/component
- [ ] **RHF + zodResolver** em todo formulário
- [ ] **nuqs** em filtros, tabs e paginação na URL
- [ ] **Server Component** por padrão; client isolado onde necessário
- [ ] Componentes em `core/modules/<modulo>/components/` — nada solto
- [ ] **zustand** só para estado global de UI (não substituir Query)
- [ ] Toda ação sensível dentro de `<PermissionGate permission="...">`
- [ ] `userType`/roles via hooks de domínio + `useAbility()`, não da sessão better-auth
- [ ] Coleções de dados em `<DataTable>` com sort/filtros/seleção/export
- [ ] Tokens de design system — sem cor raw, sem `dark:`
- [ ] **Playwright** para fluxo/UX crítico (novo ou estendido)
- [ ] Ícones de `lucide-react` apenas; animações preservadas
