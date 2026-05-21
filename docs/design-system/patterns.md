# Patterns — Workana AI

## Dashboard Shell

- Sidebar ocupa `h-svh` e pode colapsar.
- Header é sticky e mostra contexto do workspace.
- Ação principal da página fica no topo direito quando aplicável.
- Breadcrumb usa nome da company ativa.

## Tabelas Operacionais

Use tabelas para membros, roles, convites, permissões, assets, execuções, créditos, integrações e logs.

Container padrão:

```tsx
<div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
  <Table>...</Table>
</div>
```

## Cards de Resumo

- Label pequeno e uppercase.
- Número com `tabular-nums` quando aplicável.
- Footer separado por divider quando houver ação ou hint.
- Sem glow por padrão.

## Onboarding

- Etapas curtas.
- Autosave.
- Explicação do valor de cada pergunta.
- Visual mais espaçoso que telas operacionais.
- Publicação final do Brain clara e auditável.

## IA

- Estado de processamento visível.
- Nunca executar ação relevante sem feedback.
- Nunca exibir confiança, ranking ou contexto derivado oculto.
- Lime (`--ai-live`) indica atividade real ou live, não decoração.

## Empty States

Todo empty state deve explicar:

- o que ainda não existe
- por que importa
- qual é a próxima ação
