# Frontend — Fluxo de Créditos

**Skill obrigatória:** `company-os-frontend` antes de qualquer implementação.

**Princípio (regra 9 do CLAUDE.md):** a tela de créditos deve comunicar o saldo e o histórico de forma imediata e legível. Sem inputs desnecessários — o usuário lê, não preenche.

**Backend disponível:**
- `GET /organizations/:orgId/credits` → `{ organizationId, balance }` ✅
- `GET /organizations/:orgId/credits/ledger` → lista de `CreditLedgerEntry` ✅

> **Nota:** adição de créditos (`POST /organizations/:orgId/credits`) só existe no admin de plataforma. No V1 não há auto-compra — o saldo é gerenciado pela Workana. A tela de créditos é read-only para a empresa.

---

## Estrutura de arquivos a criar

```
apps/web/src/
  app/dashboard/(shell)/workspace/agents/credits/
    page.tsx                          ← server component, importa AgentCreditsPage

  core/modules/agents/
    hooks/
      use-credits.ts                  ← queries de saldo e ledger
    pages/
      agent-credits-page.tsx          ← página completa
    components/
      credits/
        credits-balance-card.tsx      ← card de saldo atual
        credits-ledger-table.tsx      ← tabela de histórico de transações
```

---

## Task 1 — `use-credits.ts`

**Contrato de tipos (baseado no backend Prisma):**

```ts
type CreditBalance = {
  organizationId: string;
  balance: number;  // saldo atual em créditos
};

type CreditLedgerEntry = {
  id: string;
  organizationId: string;
  entryType: 'credit_added' | 'credit_debited' | 'run_debit' | 'refund';
  amount: number;          // positivo = crédito, negativo = débito
  balanceAfter: number;
  runId: string | null;    // null em entradas manuais
  idempotencyKey: string | null;
  metadata: unknown;
  createdByUserId: string | null;
  createdAt: string;
};
```

- [ ] `useCreditsBalance(orgId)` — `GET /organizations/:orgId/credits`
  - Refetch a cada 30s (saldo muda com execuções)
  - `enabled: Boolean(orgId)`

- [ ] `useCreditsLedger(orgId)` — `GET /organizations/:orgId/credits/ledger`
  - Lista completa, mais recente primeiro
  - Refetch a cada 30s

---

## Task 2 — `credits-balance-card.tsx`

**Objetivo:** comunicar o saldo atual de forma clara e imediata.

- [ ] Card com `bg-[var(--bg-raised)]`, `border border-[var(--line-default)]`, `rounded-[var(--r-lg)]`, padding `p-6`
- [ ] Eyebrow `"Saldo atual"` em `text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]`
- [ ] Valor em destaque: `balance.toLocaleString('pt-BR')` + `" créditos"` em `text-[36px] font-semibold text-[var(--fg-primary)]`
- [ ] Se `balance <= 0`: valor em `text-[var(--error)]` + badge "Sem créditos" em vermelho
- [ ] Se `balance > 0 && balance <= 100`: badge "Saldo baixo" em amarelo
- [ ] Loading: Skeleton `h-[88px] w-full`
- [ ] Informação discreta abaixo: `"Créditos são consumidos a cada execução de agente"`
- [ ] **Não exibir** botão de comprar/adicionar — a adição é feita pela plataforma Workana

---

## Task 3 — `credits-ledger-table.tsx`

**Objetivo:** histórico completo de transações de crédito.

- [ ] `DataTable` com colunas:

  | Coluna | Tipo | Sortable |
  |--------|------|----------|
  | `createdAt` | Data formatada `dd/MM/yyyy HH:mm` | sim |
  | `entryType` | Badge por tipo (verde=adição, vermelho=débito) | sim |
  | `amount` | Valor com sinal (`+50` / `-12`) em cor | sim |
  | `balanceAfter` | Saldo após a transação | sim |
  | `runId` | Link para o run se existir ("Ver execução") | não |

- [ ] Badge por `entryType`:
  - `credit_added` / `refund` → badge verde, texto "Crédito"
  - `credit_debited` / `run_debit` → badge vermelho, texto "Débito"

- [ ] Valor com sinal:
  - `amount > 0` → `+${amount}` em `text-[var(--success)]`
  - `amount < 0` → `${amount}` em `text-[var(--error)]`

- [ ] Filtros: tipo (`crédito` / `débito`), por run (`sim` / `não`)

- [ ] Estado vazio: `EmptyState` com ícone `Coins`, "Nenhuma transação ainda", sem ação

- [ ] Loading: Skeleton `h-10` × 5 linhas

---

## Task 4 — `agent-credits-page.tsx`

**Objetivo:** página completa montando balance card + ledger.

```
┌─────────────────────────────────────────────────────┐
│  Créditos                                           │
│  Saldo e histórico de consumo da empresa.           │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Saldo atual                                 │   │
│  │  1.250 créditos                              │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Histórico de transações                            │
│  ┌──────────────────────────────────────────────┐   │
│  │  Data       | Tipo    | Valor | Saldo | Run  │   │
│  │  22/05/2026 | Débito  | -12   | 1.238 | →   │   │
│  │  20/05/2026 | Crédito | +500  | 1.250 |     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

- [ ] `useActiveOrganization()` para `orgId`
- [ ] `useAbility()` + verificar `can('read', 'Credit')` — se não tiver permissão: `EmptyState` de permissão
- [ ] Loading: skeleton do card + skeleton da tabela
- [ ] `PageLayout` com:
  - `title="Créditos"`
  - `description="Saldo e histórico de consumo da empresa."`
  - sem `actions` (leitura only)
- [ ] `CreditsBalanceCard` com dados de `useCreditsBalance`
- [ ] `CreditsLedgerTable` com dados de `useCreditsLedger`

---

## Task 5 — Rota `app/dashboard/(shell)/workspace/agents/credits/page.tsx`

- [ ] Server component simples:
  ```tsx
  import { AgentCreditsPage } from 'src/core/modules/agents/pages/agent-credits-page';
  export default function Page() { return <AgentCreditsPage />; }
  ```

---

## Verificação final

- [ ] `PermissionGate` ou `useAbility` em toda a página (permissão `credit.read`)
- [ ] Saldo negativo ou zero exibido em vermelho com indicação visual clara
- [ ] Link de run no ledger navega corretamente para `/dashboard/workspace/agents/:agentId/executions` quando existir
- [ ] Nenhum botão de adição de créditos visível (é responsabilidade da plataforma)
- [ ] `pnpm --filter @company-os/web lint` passa
