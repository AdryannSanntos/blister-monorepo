# Épico: Créditos

## Objetivo

Moeda interna por empresa; agentes só executam com saldo.

## Regras

| Regra | Valor |
|-------|-------|
| Conta | Por empresa |
| Free tier | US$ 20 **único** (config admin) |
| Recorrência | Não mensal |
| Sem saldo | Bloqueia geração |
| Débito | Por step LLM (`AgentRunStep`) |
| Recarga self-service | Fase 2 |
| Ajuste admin | MVP — manual |

## Entidades

```
CreditBalance     ← empresaId, amount, currency
CreditLedger      ← tipo (CREDIT|DEBIT|ADJUST), amount, agentRunStepId?, metadata
PlatformCreditSettings ← freeTierAmount, markupDefault, currency
```

## Fluxo

1. Empresa criada → credit US$ 20 from settings
2. Pré-run: verificar saldo ≥ estimativa
3. Pós-step LLM: debit real cost × markup
4. Falha parcial: política estorno (documentar na implementação)

## UI

- Saldo visível no header ou dashboard
- Mensagem clara ao bloquear: "Créditos esgotados"

## API

- `GET /api/empresa/creditos` — saldo + histórico resumido
- Admin: `POST /api/platform/empresas/:id/creditos/ajustar`
