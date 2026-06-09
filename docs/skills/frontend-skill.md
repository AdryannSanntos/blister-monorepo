# Frontend Skill — Blister

> Fonte de verdade: [`docs/prd/blister-master-prd.md`](../prd/blister-master-prd.md) · [`CLAUDE.md`](../../CLAUDE.md) (Regra 17)

## Objetivo

Guiar implementação, refatoração ou revisão em `apps/web`.

## Estrutura

```
apps/web/src/
  app/                    rotas — Server Components por padrão
  core/
    modules/<modulo>/
      pages/              "use client" quando interativo
      components/         TODO componente de feature aqui
      hooks/              hooks de domínio + TanStack Query
    shared/
      components/ui/      shadcn
      components/         reutilizáveis cross-módulo
      hooks/use-ability.ts
      utils/api-client.ts
```

## Regras de codificação (invioláveis)

| Regra | Obrigatório |
|-------|-------------|
| Validação | **Zod sempre** — formulários, parsers, contratos |
| Servidor | **TanStack Query** via hooks — nunca fetch em page/component |
| Formulários | **RHF + zodResolver** — sempre, `mode: 'onBlur'` |
| Filtros / tabs / URL | **nuqs** — sempre |
| Componentes | Só em `core/modules/<modulo>/components/` ou `core/shared/` |
| Renderização | **Server Components** por padrão; client isolado; Server Actions quando couber |
| Estado global UI | **zustand** quando necessário — não para dados de API |
| UX | **Playwright** — fluxos críticos e regressão visual/interação |

## Linguagem UI

- **Criar post** (não "Gerar com IA")
- Campanha, Cérebro da Marca, Peça, Créditos, Aprovar
- Sem expor "agente", "prompt", "LLM"

## Fluxos MVP

1. Onboarding → Cérebro da Marca (mínimo viável)
2. Geração rápida: 1 frase → peça (PNG + legenda + hashtags)
3. Campanha opcional → enriquece contexto
4. Revisão: Aprovar / Negar / Editar / Pedir melhoria / Regenerar
5. Saldo de créditos visível; bloqueio sem saldo

## nuqs

```tsx
import { parseAsString, useQueryState } from 'nuqs';

const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('todas'));
```

Tabs, filtros de DataTable, paginação e views alternáveis → nuqs, não `useState` solto.

## TanStack Query

```tsx
export function useCampanhas() {
  return useQuery({
    queryKey: ['campanhas'],
    queryFn: async () => {
      const { data } = await apiClient.get<Campanha[]>('/campanhas');
      return data;
    },
  });
}
```

## Playwright

Novas telas e fluxos críticos exigem specs e2e: happy path, erro, permissão, filtros/tabs via URL.

## Rotas alvo

```
/dashboard                    home operacional
/dashboard/criar              geração rápida
/dashboard/campanhas          lista + detalhe
/dashboard/pecas              revisão/aprovação
/dashboard/cerebro            Cérebro da Marca
/dashboard/creditos           saldo
/system/*                     admin plataforma
```

## Checklist

- [ ] Zod + RHF em formulários
- [ ] TanStack Query em dados de servidor
- [ ] nuqs em filtros/tabs/paginação
- [ ] Server Component por padrão
- [ ] Componentes no módulo correto
- [ ] zustand só para UI global
- [ ] PermissionGate nas ações sensíveis
- [ ] DataTable para listagens
- [ ] Playwright para UX crítica
- [ ] Tokens do design system
