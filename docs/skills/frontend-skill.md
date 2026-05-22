# Frontend Skill — Workana AI

## Objetivo

Guiar implementação, refatoração ou revisão em `apps/web`.

## Estrutura Obrigatória

```
apps/web/src/app/                 rotas App Router
apps/web/src/core/modules/        domínios do produto
apps/web/src/core/shared/         componentes, hooks e utils compartilhados
apps/web/src/core/shared/components/ui/  shadcn/ui oficial
```

## Regras Críticas

- Toda chamada HTTP deve viver em hook de domínio com TanStack Query.
- Não usar `useState` para estado de servidor.
- Organização ativa vem de `useActiveOrganization()`.
- Toda ação sensível usa `PermissionGate` ou `useAbility()`.
- Formulários reais usam `react-hook-form`, Zod e `mode: 'onBlur'`.
- Coleções de dados usam `<DataTable>` de `core/shared/components/ui/data-table.tsx` (wrapper TanStack Table).
- A UI usa tokens semânticos, não cores raw.
- Reutilizar componentes existentes antes de criar novos.

## Regras de UX para Agentes V1

- Chat geral e editor de workflow devem usar layout full-focus compartilhado (fora do dashboard shell).
- Cada agente deve abrir em tela unica full-focus com nave interna: Chat, Workflow, Execucoes, Configuracoes.
- Pensamentos/processamento no chat ficam recolhidos por padrao.
- Execucoes no detalhe do agente mostram timeline aberta por padrao.
- Durante execucao ativa da conversa, input do chat deve ficar bloqueado.
- Resultado do agente deve aparecer no chat com abas interativas de outputs/arquivos.

## Linguagem de Produto

Use: Workana AI, Workspace, Company, Brain, Agentes, Créditos, Integrações, Assets, Execuções.

Evite: naming antigo, chatbot genérico e termos internos como rótulos visíveis quando Agentes/Execuções forem mais claros.

## Regras de Componentes de Formulário

Todo campo de formulário segue esta estrutura obrigatória com `FormItem`:

```tsx
<FormItem>
  <FormLabel required>Campo obrigatório</FormLabel>   {/* required → exibe * vermelho */}
  <FormControl>
    <Input {...field} />
  </FormControl>
  <FormDescription>Texto auxiliar opcional</FormDescription>
  <FormMessage />
</FormItem>
```

### Comportamento padronizado

| Elemento | Estilo |
|----------|--------|
| `FormLabel` | `text-xs`, `var(--fg-tertiary)`, vira `text-destructive` com erro |
| `FormLabel required` | Exibe `*` vermelho após o texto |
| Componente (foco) | `border-primary` + `ring-primary/25` |
| Componente (erro) | `border-destructive` (sem ring) |
| Componente (erro + foco) | `border-destructive` + `ring-destructive/30` |
| `FormMessage` | `text-xs text-destructive`, `mt-0.5` (colada ao input) |
| `FormDescription` | `text-xs var(--fg-tertiary)`, `mt-1` |

### Componentes cobertos

`Input`, `Textarea`, `Select` (via `aria-invalid`) e `PasswordInput` (via `InputGroup has-` selector).

Regra: **nunca customizar os estilos de estado via className diretamente** — as classes de erro e foco vivem nos componentes base e são ativadas pelo `FormControl` através do `aria-invalid`.

## Exemplo de Permissão

```tsx
<PermissionGate permission="member.invite">
  <Button>Convidar membro</Button>
</PermissionGate>
```

## Exemplo de Hook

```tsx
export function useOrganizationMembers(orgId: string | null) {
  return useQuery({
    queryKey: ['members', orgId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${orgId}/members`);
      return data;
    },
    enabled: Boolean(orgId),
  });
}
```

## Design System

- Light theme é default; dark precisa continuar funcional.
- Fundo off-white frio, azul principal, dourado para premium, lime para IA ativa.
- Nunca usar `dark:` utility; tokens resolvem os temas.
- Cards sem padding na raiz.
- Três ou mais ações lado a lado viram `DropdownMenu`.
- Empty states são obrigatórios.

## Tabelas operacionais

Toda coleção de entidades usa `<DataTable>` de `core/shared/components/ui/data-table.tsx`. Os controles abaixo são obrigatórios:

| Controle | Como ativar |
|----------|-------------|
| Sort | Omitir `enableSorting` na `ColumnDef` (default `true`). Desativar só em `select`, `actions` e visuais sem critério. |
| Config de colunas | Omitir `enableHiding` na `ColumnDef` + definir `meta.label`. O botão `Columns3` aparece automaticamente. |
| Select / select-all | Passar `bulkActions` ou `exportOptions`. Coluna checkbox é injetada automaticamente; checkboxes ficam verticalmente alinhados. |
| Filtros | Passar `filters: DataTableFilter[]` com predicados específicos do fluxo. Botão `SlidersHorizontal` aparece automaticamente. |
| Floating footer | Aparece automaticamente ao selecionar linhas. `exportOptions` adiciona CSV/PDF; `bulkActions` adiciona ações do domínio. |

## Checklist

- [ ] Sem fetch direto em page/component
- [ ] Server state em React Query
- [ ] `activeOrgId` via domínio próprio
- [ ] Ações sensíveis protegidas por permissão
- [ ] Form com RHF + Zod
- [ ] Tokens de design usados
- [ ] UI e texto alinhados com Workana AI
- [ ] Tabelas com sort, config de colunas, select, filtros e floating footer
