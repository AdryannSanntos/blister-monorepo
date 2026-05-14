# Code Review Skill

## Objetivo

Guiar a IA quando a tarefa for revisar codigo deste projeto.

## Ler Antes

- `docs/skills/project-engineering-skill.md`
- `docs/decisions/stack-decisions.md`

## Foco Principal da Revisao

- bugs
- regressao comportamental
- quebra de contrato entre `web`, `api` e pacotes compartilhados
- uso incorreto da stack oficial
- risco arquitetural
- ausencia de validacao ou permissao onde deveria existir

## Ordem de Analise

1. verificar se a mudanca respeita a arquitetura do monorepo
2. verificar se a stack oficial foi seguida
3. verificar impacto em auth, organizacoes e permissoes
4. verificar contratos compartilhados e schemas
5. verificar riscos de manutencao e gaps de teste

## Regras de Revisao

- findings primeiro, resumo depois
- cada finding deve apontar risco concreto
- priorizar severidade alta para quebra de auth, authz, contratos de dominio e dados
- apontar quando a mudanca usa ferramenta errada para um problema que ja tem stack definida

## Itens Criticos Deste Projeto

- `better-auth` nao deve ser contornado
- `better-auth` nao deve reassumir responsabilidades de organizacao ativa, roles ou permissoes
- permissoes nao devem ser hardcoded fora de `packages/authz`
- `Prisma` e o unico acesso a banco permitido
- `TanStack Query` nao deve ser trocado por estado local para dados de servidor
- `nuqs` deve ser preferido para estado de filtro compartilhavel
- componentes de UI devem respeitar o design system oficial e os tokens globais
- overlays, tabs, forms e navigation precisam manter acessibilidade basica
- a rota `/design-system` deve continuar coerente com o visual de referencia e com o codigo real

## Saida Esperada

- lista objetiva de findings ordenados por severidade
- referencia de arquivo e contexto
- perguntas abertas apenas se realmente bloquearem a conclusao
- resumo curto no final somente se necessario
