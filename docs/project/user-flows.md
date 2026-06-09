# Fluxos de Usuário — Blister (Marketing com IA)

> **Atualizado:** 2026-06-09 — agentes isolados, revisão por agente. Ver [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md).

Princípio: **simplicidade radical** — máx. 2–3 campos para iniciar; labels operacionais por superfície; zero jargão de IA na UI.

## Perfis

| Perfil | Quem é |
|--------|--------|
| **BUSINESS** | Dono do negócio / MEI |
| **ADMIN** | Operador plataforma (`platform_owner` / `platform_admin`) |

## 1. Cadastro e onboarding

```
/auth/signup → verify email → /onboarding
  → Cérebro da Marca (logo + tom + nicho…)
  → US$ 20 créditos
  → /dashboard ou /workspaces
```

## 2. Jornada — Agente direto (sem campanha)

```
/dashboard ou atalho do agente (ex.: criar texto, gerar imagem)
  → Input (1 frase)
  → POST /api/agents/:agentId/run
  → Pode PAUSAR → retoma mesma run
  → Preview do output **desse agente**
  → Aprovar | Negar | Editar | Pedir melhoria | Regenerar (na superfície do agente)
  → Learning indexado por agentId
```

## 3. Jornada — Com campanha (workspace)

```
/dashboard/campanhas → Nova campanha (nome + objetivo)
  → /dashboard/campanhas/[id]
  → (Opcional) contexto + arquivos
  → Usuário escolhe qual agente rodar (estratégia, texto, visual…)
  → Cada agente: run isolada + revisão na própria aba
  → Histórico de AgentRuns na campanha
```

**Não** há pipeline automático entre agentes.

## 4. Revisão e auto-melhoramento (por agente)

| Ação | Efeito |
|------|--------|
| Aprovar | `AGENT_LEARNING` positivo para aquele `agentId` |
| Negar | Sinal negativo (+ motivo opcional) |
| Editar | Diff em `outputPayload` |
| Pedir melhoria | Nova run do **mesmo** agente |
| Regenerar | Nova run |

Toast: "Preferência salva — próximas criações vão melhorar"

## 5. Créditos

```
Saldo no header
  → Débito por step generate_* na run
  → Saldo zero → bloqueio claro
```

## 6. Admin plataforma

```
/workspaces/admin → créditos, AI catalog, catálogo de agentes, RAG
  → Ajuste saldo por empresa
  → Reindex RAG
```

## Fora do MVP

Recarga Stripe, Stories/carrossel, publicação direct post, equipes multi-usuário.
