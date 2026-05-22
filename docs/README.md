# Workana AI Docs

Esta pasta concentra a documentação viva do Workana AI e substitui referências genéricas por contexto real do produto, da stack e do estado atual da implementação.

## Fonte de Verdade

1. `docs/prd/workana-ai-master.md` — documento mestre de produto, escopo, UX e identidade
2. `CLAUDE.md` — regras operacionais obrigatórias do monorepo
3. `docs/decisions/2026-05-22-agents-v1-contract.md` — contrato vigente de Agentes V1
4. `docs/decisions/stack-decisions.md` — decisões técnicas aprovadas
5. `docs/decisions/execution-order.md` — ordem de execução do produto
6. `docs/design-system/README.md` — sistema visual e tokens oficiais
7. `docs/skills/README.md` — skills operacionais para agentes

## Estrutura

- `context/`: estado atual do projeto e limites técnicos
- `prd/`: visão de produto, documento mestre e análises de aderência
- `plans/`: planos aprovados de implementação
- `decisions/`: decisões arquiteturais e padrões obrigatórios da stack
- `design-system/`: tokens, componentes, padrões visuais e mapa da rota `/design-system`
- `examples/`: referências de código e exemplos preservados para consulta
- `setup/`: setup local, deploy e observações operacionais
- `skills/`: instruções para IA trabalhar no projeto com contexto correto
- `superpowers/`: specs e planos históricos de execução; não são fonte de verdade atual quando divergirem dos arquivos acima

## Produto

Workana AI é uma camada de inteligência para empresas que coordenam trabalho com freelancers, fornecedores e times remotos. O produto organiza contexto, briefings, demandas, agentes de IA, créditos, equipe, permissões e integrações dentro de um workspace por empresa.

Termos oficiais de UI: Workspace, Company, Brain, Agentes, Créditos, Integrações.

## Regra Geral

Quando houver divergência entre documentação histórica e código atual, a fonte de verdade é: código implementado, `CLAUDE.md`, documento mestre e decisões atuais. Planos antigos devem ser lidos como registro histórico, não como contrato vigente.
