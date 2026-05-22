# Workana AI — Documento Mestre do Projeto

## Update 2026-05-22 — Contrato de Agentes V1

Quando houver conflito nas secoes historicas deste PRD, o escopo oficial de Agentes V1 segue `docs/decisions/2026-05-22-agents-v1-contract.md`.

Resumo do contrato travado:

- Catalogo de agentes da empresa: custom-only no V1.
- Chat geral: sempre via agente de contexto interno.
- Delegacao: resposta continua no chat geral; detalhamento da execucao fica no agente delegado.
- UX: telas full-focus para chat geral, workspace do agente e edicao de workflow.
- Governanca de execucao: max 3 simultaneas por empresa, fila FIFO, 1 retry automatico na mesma execucao.
- Contexto da IA: retrieval em camadas com permissao e bloqueio de segredos.

## Resumo executivo

Workana AI é uma camada de inteligência para empresas que contratam, coordenam e escalam trabalho com freelancers, fornecedores e times remotos. O produto centraliza contexto, briefings, demandas, agentes de IA, créditos, equipe, permissões e integrações dentro de um workspace por empresa.

O foco inicial não é marketplace aberto. O produto nasce como um sistema operacional B2B para coordenação de trabalho externo, com IA aplicada a contexto, briefing, execução e governança.

## Posicionamento

- Produto: **Workana AI**
- Público primário: empresas que contratam freelancers com frequência, times de marketing, produto, operação e conteúdo, PMEs e equipes com colaboradores externos
- Público secundário: agências, startups, fornecedores e times internos com parceiros recorrentes
- Promessa: menos atrito operacional, mais velocidade para iniciar demandas, mais clareza de contexto e mais controle por permissões e créditos

## Proposta de valor

Workana AI ajuda empresas a operar com mais inteligência ao centralizar contexto, processos e execução de trabalho com IA.

Resolve:

- briefings desorganizados
- perda de contexto entre empresa e prestadores
- alinhamento manual repetitivo
- baixa visibilidade sobre demandas
- comunicação pouco padronizada
- dificuldade de escalar trabalho com consistência

## Escopo do MVP

Entram no MVP:

- login e autenticação
- criação ou seleção de company/workspace
- convite de membros por email
- onboarding curto da empresa
- brain da empresa com texto, instruções, arquivos e assets
- roles e permissões por empresa
- créditos de IA por empresa
- agentes customizados por empresa
- histórico de execuções
- configurações do workspace

Fora do escopo inicial:

- marketplace público completo
- pagamento/escrow
- busca aberta de freelancers
- matching sofisticado
- app mobile nativo
- reputação financeira complexa

## Fluxos principais

### Primeiro acesso sem convite

1. Usuário cria conta ou faz login.
2. Sistema detecta ausência de vínculo com empresa.
3. Usuário cria ou confirma uma company/workspace.
4. Sistema exibe onboarding curto.
5. Onboarding coleta contexto mínimo.
6. Sistema gera o brain inicial.
7. Usuário entra no dashboard principal.

### Primeiro acesso com convite

1. Admin envia convite por email.
2. Usuário abre link único.
3. Usuário faz login ou cadastro.
4. Sistema aceita vínculo com a empresa.
5. Usuário entra no workspace com role e permissões definidas.

### Operação contínua

1. Time acessa workspace.
2. Consulta brain e agentes.
3. Executa tarefas com IA.
4. Consome créditos.
5. Acompanha histórico, permissões e integrações.

## Brain da empresa

O Brain é o núcleo de contexto do Workana AI. Ele guarda conhecimento reutilizável para agentes e usuários trabalharem com alinhamento.

Guarda:

- nome, segmento e descrição da empresa
- objetivos e público-alvo
- tom de voz e preferências
- instruções de marca
- processos, regras e FAQs
- arquivos, assets e referências
- contextos futuros de operação

Função:

- servir como contexto base para agentes
- padronizar respostas e ações
- reduzir retrabalho e perda de contexto
- concentrar conhecimento reutilizável da empresa

## Onboarding

O onboarding deve ser curto, visual, direto e com autosave. Deve coletar o mínimo necessário para inicializar o Brain sem cansar o usuário.

Estrutura recomendada:

1. Boas-vindas ao Workana AI
2. Nome e segmento da empresa
3. Objetivo principal
4. Público-alvo
5. Tom de voz
6. Canais de trabalho
7. Referências, arquivos ou assets
8. Revisão e publicação do Brain

## Convites

O convite contém email, empresa, role sugerida, permissões associadas, status, expiração e token único.

Estados oficiais:

- pendente
- aceito
- expirado
- cancelado

## Roles e permissões

Um usuário pode participar de várias empresas. Cada empresa tem membros, roles e permissões próprias. Um membro pode receber permissões extras por override.

Roles de sistema atuais:

- owner
- admin
- member

Roles futuras de produto:

- manager
- editor
- viewer
- custom

Permissões devem continuar centralizadas em `packages/authz` e avaliadas via CASL no backend e frontend.

## Créditos

Créditos representam consumo de IA por empresa.

Regras:

- cada empresa tem saldo próprio
- cada ação de IA consome créditos
- consumo deve ser visível por agente e por usuário
- usuário vê saldo, histórico e projeção

Estados:

- saudável
- baixo
- crítico
- limite atingido

## Agentes

Agente é uma unidade operacional de IA com objetivo, workflow, instruções e resultado esperado.

Agentes no V1:

- catálogo visível custom-only por empresa
- tela única full-focus por agente
- workflow e versionamento por agente
- chat com branch por edição, regenerate e copy
- agentes internos do sistema apenas para contexto/delegação, sem exposição no catálogo

Estados:

- draft
- active
- paused
- error
- archived

## Entidades conceituais

- User
- Company
- Membership
- Role
- Permission
- Invitation
- CompanyBrain
- BrainAsset
- Agent
- AgentRun
- CreditLedger
- Integration
- AuditLog

## Navegação principal

- Dashboard
- Brain
- Agentes
- Equipe
- Créditos
- Integrações
- Configurações

## Direção visual

A interface deve evitar aparência genérica de dashboard SaaS. O objetivo é parecer um sistema autoral, premium e operacional.

Direção:

- light theme como default
- fundo off-white frio puxado para azul
- azul como cor principal
- dourado apenas para premium
- lime discreto para IA ativa
- nada de preto absoluto
- nada de branco puro em superfícies principais quando houver alternativa tokenizada

Sensação desejada:

- profissional
- atual
- elegante
- tecnológica
- inteligente
- levemente editorial

## Design tokens oficiais

Paleta base aprovada:

- neutral: `#f7f9fc` até `#151b27`
- primary: `#eef4ff` até `#16224e`, com `#3366ff` como azul central
- sky: `#f1f7ff` até `#10284c`
- gold: `#fff9ea` até `#3c2602`
- lime: `#f5ffe8` até `#192d06`
- success, warning, danger e info conforme docs do design system

Tipografia:

- display: Instrument Serif ou equivalente editorial
- UI: Geist, Satoshi, General Sans ou Inter
- mono: Geist Mono, JetBrains Mono ou IBM Plex Mono

Regras:

- Display só em momentos de assinatura e impacto
- números em tabelas e dashboards usam `tabular-nums`
- hover e feedback visual são obrigatórios em ações interativas
- processos de IA sempre exibem estado visível
- empty states sempre tratados

## Roadmap funcional

### Fase 1

- Auth
- Criação/seleção de empresa
- Onboarding
- Brain
- Convites
- Roles e permissões
- Créditos
- Agentes iniciais
- Dashboard

### Fase 2

- Integrações
- Templates
- Mais agentes
- Histórico avançado
- Permissões finas
- Melhorias de UX

### Fase 3

- Automações robustas
- Analytics
- Workflows visuais
- Personalização por empresa

## Decisões fixadas

- O produto se chama Workana AI.
- O foco é empresa e operação, não marketplace.
- O primeiro login sem convite leva à criação/seleção de company.
- O onboarding é curto e fluido.
- Cada empresa tem Brain próprio.
- Convites são por email.
- Roles e permissões são obrigatórias.
- Créditos são por empresa.
- Agentes customizados por empresa fazem parte do MVP; agentes internos do sistema não aparecem no catálogo V1.
- UI deve ser única, forte e não genérica.
- Azul é a base visual principal.
