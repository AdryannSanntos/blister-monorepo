# Select — truncamento de texto

## Regra

O valor exibido no **trigger** de `<Select>` nunca deve quebrar em múltiplas linhas. Se o texto não couber na largura disponível, deve ser truncado com reticências (`…`).

Isso vale para qualquer contexto com largura limitada — em especial sidebars estreitas (ex.: Workflow Builder, filtros, formulários em painéis laterais).

## Implementação

O comportamento é garantido pelo componente compartilhado em `apps/web/src/core/shared/components/ui/select.tsx`:

- `SelectTrigger`: `min-w-0` para permitir encolhimento em layouts flex
- `SelectValue` (via seletor `*:data-[slot=select-value]`): `min-w-0 flex-1 truncate`
- Ícone do chevron: `shrink-0` (já aplicado)

**Não sobrescrever** com `line-clamp`, `whitespace-normal` ou `flex-wrap` no trigger sem motivo explícito.

## Containers pais

Em sidebars ou colunas estreitas, o wrapper do select também precisa de `min-w-0` para o truncamento funcionar dentro de flex/grid. Exemplo: `FieldBlock` no `workflow-sidebar.tsx`.

## Checklist

- [ ] Texto longo no trigger aparece em uma linha com `…` no fim
- [ ] Chevron permanece visível e não é empurrado para fora
- [ ] Pai do select tem `min-w-0` quando está em flex com largura fixa
