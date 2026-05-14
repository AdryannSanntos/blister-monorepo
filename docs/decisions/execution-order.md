# Ordem de Execução do AI Company OS

## Objetivo

Este documento define a ordem completa de execução do produto, do primeiro acesso até as funcionalidades mais avançadas, considerando que ainda não existe nenhum fluxo montado. A proposta é estabelecer uma sequência lógica de construção e de experiência do usuário, começando por autenticação e onboarding de contexto da empresa, passando pela operação central de IA e terminando em automações e integrações avançadas.[file:11][file:10]

## Diretrizes da ordem

A ordem deve seguir quatro princípios: primeiro garantir acesso e organização do workspace, depois capturar o contexto da empresa, em seguida ativar os fluxos de geração e governança, e por fim expandir para conteúdo, páginas, automações e integrações externas.[file:11][file:9]

A experiência precisa sempre deixar claro em qual empresa o usuário está operando, porque o produto é multiempresa e a organização ativa é a referência principal do workspace.[file:20][file:9]

Decisão arquitetural complementar: `better-auth` deve cuidar apenas de autenticação e sessão. Organização ativa, convites, cargos, permissões e regras de acesso pertencem ao domínio da aplicação com persistência própria e avaliação final via `CASL`.

## Fase 1 — Entrada no sistema

### 1. Cadastro e login

O primeiro fluxo do produto deve ser autenticação. O usuário precisa conseguir criar conta, entrar com email e senha, recuperar acesso e, quando disponível, usar login social opcional.[file:20][file:9]

Os emails transacionais desse fluxo devem usar `Resend`, incluindo verificação de email e recuperação de senha.

Esse fluxo deve ser simples, direto e confiável, porque é a porta de entrada para todo o restante do sistema. Sem ele, nenhum outro fluxo existe de forma útil.

### 2. Identificação da organização ativa

Depois de autenticado, o sistema deve verificar se o usuário já pertence a uma ou mais organizações. Se houver mais de uma, o usuário precisa escolher em qual workspace quer operar naquele momento.[file:20][file:9]

A organização ativa deve ficar sempre visível na interface, especialmente no topo da sidebar, para evitar confusão entre empresas.

Essa organização ativa não deve depender do `better-auth`; ela deve ser resolvida e persistida pelo domínio do produto.

### 3. Primeira entrada

Se for o primeiro acesso do usuário, o sistema não deve jogá-lo direto no dashboard vazio. Ele deve ser conduzido para um onboarding inicial que explique o produto e colete o contexto geral da empresa.[file:11]

## Fase 2 — Criação da empresa

### 4. Criar workspace

Quando o usuário ainda não tiver empresa criada, o primeiro passo após o login é criar o workspace da organização. Esse fluxo deve ser curto e objetivo, pedindo apenas o essencial para iniciar a operação.[file:11][file:20]

O foco aqui não é cadastro burocrático, mas criar a base da empresa dentro do produto para que o restante da experiência faça sentido.

### 5. Convite ou entrada em workspace existente

Se o usuário entrar por convite, ele deve cair diretamente no workspace correto após aceitar o convite. O sistema precisa comunicar claramente o nome da empresa, o papel do usuário e o que ele pode acessar.[file:20][file:9]

Quando o convidado ainda não tiver conta, o fluxo deve ser: abrir convite, criar conta, autenticar e entrar na empresa correta sem etapas manuais extras.

## Fase 3 — Onboarding da empresa

### 6. Onboarding do contexto geral

Esse é o fluxo mais importante depois da autenticação. Ele precisa capturar o contexto essencial da empresa para alimentar tudo que vier depois: Company Brain, Skills, Outputs, conteúdo e páginas.[file:11]

O onboarding deve coletar, no mínimo, posicionamento, serviços, produtos, público-alvo, tom de voz, diferenciais, regras de comunicação, FAQ e processos internos relevantes.[file:11]

### 7. Estrutura do onboarding

O onboarding deve ser dividido em etapas curtas, não em um formulário único longo. Cada etapa precisa mostrar progresso, explicação do valor daquela informação e opção de salvar e continuar depois.

Fluxo recomendado:
1. Boas-vindas e explicação do produto.
2. Dados básicos da empresa.
3. Posicionamento e proposta de valor.
4. Produtos e serviços.
5. Público-alvo.
6. Tom de voz e comunicação.
7. Diferenciais e FAQs.
8. Processos e regras internas.
9. Revisão final e publicação do contexto.[file:11]

### 8. Publicação do contexto inicial

Ao final do onboarding, o sistema deve gerar uma visão consolidada do contexto da empresa. O usuário revisa, ajusta o que faltar e publica a primeira versão oficial do Company Brain.[file:11]

Esse contexto publicado passa a ser a referência para as próximas execuções.

Regra de governança inicial: apenas o `owner` da empresa pode publicar essa primeira versão.

## Fase 4 — Home operacional

### 9. Dashboard inicial

Depois do onboarding, o usuário deve ir para um Dashboard que mostre o estado atual do workspace: pendências, próximos passos, primeiros outputs, acesso rápido às skills e alertas importantes.[file:11][file:16]

O Dashboard não deve ser apenas decorativo. Ele precisa orientar a ação do usuário e responder rapidamente: o que está pronto, o que falta e o que fazer agora.

### 10. Caixa de entrada

Logo após o Dashboard, o produto deve ter uma Caixa de entrada operacional para concentrar tudo que exige ação: aprovações, ajustes, execuções pendentes, sugestões e alertas.[file:16]

Essa área funciona como o centro de decisões rápidas do sistema e reduz a chance de o usuário perder itens importantes.

## Fase 5 — Núcleo de IA

### 11. Company Brain editável

Depois do onboarding, o contexto não pode ficar estático. O usuário precisa conseguir acessar Company Brain e atualizar informações ao longo do tempo sem refazer tudo do zero.[file:11]

Esse fluxo deve permitir edição por blocos, visualização do contexto atual, destaque para mudanças importantes e publicação de novas versões do contexto.

### 12. Skills

A próxima camada é a área de Skills, onde o usuário descobre o que o sistema sabe fazer e escolhe uma tarefa para executar.[file:11]

Cada skill deve explicar claramente seu objetivo, tipo de entrada, tipo de saída e quando ela faz sentido.

### 13. Execução de skill

A execução de skill é um dos fluxos centrais do produto. O usuário seleciona uma skill, preenche os inputs pedidos e dispara a geração do output com base no contexto da empresa.[file:11][file:10]

O sistema deve mostrar que está processando, indicar o estágio atual e entregar um resultado que possa ser revisado, salvo e reaproveitado.

### 14. Histórico de outputs

Todo output gerado precisa ir para uma área própria de histórico, onde o usuário consiga consultar, filtrar e reutilizar resultados anteriores.[file:11]

Essa área precisa ser consultável por status, data, origem, tipo e contexto da execução.

## Fase 6 — Governança

### 15. Aprovações

Nem todo output deve ser usado imediatamente. O fluxo de aprovações precisa existir para garantir supervisão humana em conteúdos e ações relevantes.[file:11]

O processo ideal é: output gerado, enviado para revisão, analisado por responsável, aprovado ou rejeitado, e então encaminhado para o próximo estágio.

### 16. Comentários e ajustes

Quando um output não estiver pronto, o sistema deve permitir feedback claro para correção. O objetivo não é apenas aprovar ou rejeitar, mas melhorar o resultado com rastreabilidade.

## Fase 7 — Reaproveitamento de conteúdo

### 17. Content Studio

Depois que o núcleo de geração estiver estável, entra o Content Studio. Ele deve transformar outputs aprovados em conteúdo pronto para uso, com foco em consistência de marca e velocidade.[file:11]

Esse fluxo deve permitir partir de uma skill, de um output anterior ou de um template.

### 18. Reaproveitamento de output

Uma vez que o output tenha sido aprovado, ele pode ser convertido em versões mais curtas, mais comerciais, mais visuais ou mais segmentadas, dependendo do objetivo do usuário.[file:11]

## Fase 8 — Camada visual

### 19. Geração visual em HTML

A camada visual entra depois do Content Studio básico. O produto deve converter conteúdo aprovado em peças visuais renderizáveis para feed, story, carrossel e criativos.[file:11]

A experiência deve manter preview claro, edição controlada e vínculo entre conteúdo original e peça derivada.

### 20. Exportação

Depois da visualização, o usuário precisa exportar o material em formato utilizável. Essa etapa deve ser simples e previsível, para evitar fricção na operação.

## Fase 9 — Páginas

### 21. Landing Page Builder

A criação de páginas vem depois da camada visual, porque depende de um contexto mais maduro de oferta, público e CTA.[file:11]

O fluxo ideal é: escolher objetivo, definir oferta, selecionar público, estruturar narrativa, revisar blocos e salvar um rascunho de página.

### 22. Templates de páginas e campanhas

Quando o sistema já tiver algumas páginas funcionando, a próxima evolução é permitir templates reutilizáveis. Isso acelera a criação de novas páginas sem recomeçar do zero.[file:10][file:11]

## Fase 10 — Escala operacional

### 23. Templates gerais

Depois que as principais saídas estiverem maduras, o produto deve permitir salvar padrões como templates de skill, de conteúdo, de visual e de página.[file:10]

Isso reduz repetição e aumenta a padronização entre diferentes usuários e empresas.

### 24. Campanhas

O passo seguinte é organizar ativos por campanha. Isso conecta conteúdo, páginas, visuais e outputs em torno de uma mesma meta de negócio.

### 25. Agenda e execuções agendadas

Depois de validar o uso manual, o sistema deve passar a permitir agenda e execuções programadas. Esse fluxo marca a transição para automações mais avançadas.[file:11]

## Fase 11 — Automações

### 26. Automações seguras

Automações devem entrar só depois que Company Brain, Skills, Outputs e Aprovações estiverem consolidados.[file:11][file:10]

Elas precisam ser criadas com supervisão humana por padrão, para evitar ações invisíveis ou fora de controle.

### 27. Execuções automáticas

Cada automação deve ter histórico de runs, status e possibilidade de revisão. O usuário precisa ver o que rodou, o que falhou e o que pode ser reprocessado.

### 28. Alertas e relatórios

Após automações básicas, o sistema deve oferecer alertas e relatórios recorrentes para acompanhamento operacional.

## Fase 12 — Integrações externas

### 29. Integrações essenciais

As integrações externas entram por último na ordem de execução, começando por o que é realmente base para o produto: provedor de LLM, storage, email e realtime.[file:10][file:19]

### 30. Conectores operacionais

Depois das integrações essenciais, o sistema pode avançar para conectores de publicação, sincronização e fluxos com outras ferramentas do negócio.[file:11]

## Ordem resumida completa

1. Auth.
2. Seleção/definição da organização ativa.
3. Criação do workspace.
4. Onboarding do contexto geral da empresa.
5. Publicação do Company Brain inicial.
6. Dashboard inicial.
7. Caixa de entrada operacional.
8. Edição contínua do Company Brain.
9. Catálogo de Skills.
10. Execução de skill.
11. Histórico de outputs.
12. Aprovações.
13. Content Studio.
14. Reaproveitamento de conteúdo.
15. Geração visual em HTML.
16. Exportação.
17. Landing Page Builder.
18. Templates.
19. Campanhas.
20. Agenda.
21. Automações seguras.
22. Execuções automáticas.
23. Alertas e relatórios.
24. Integrações essenciais.
25. Conectores externos avançados.

## Ordem recomendada de implementação

Embora a experiência do usuário tenha essa sequência completa, a implementação deve respeitar a ordem de dependência do produto: autenticação e organização, onboarding de contexto, Company Brain, Skills, Outputs, Aprovações, depois conteúdo, visual, páginas, automações e integrações.[file:11][file:10]

Na prática, a etapa de autenticação e organização precisa incluir a migração para auth-only no `better-auth`, a criação do domínio próprio de organizações e a consolidação do modelo de roles por empresa com `owner`, `admin`, `member`, roles custom e exceções por usuário.

Essa ordem evita criar funcionalidades avançadas sem a base de contexto que dá sentido ao sistema.

## Regra central do onboarding inicial

O onboarding inicial precisa existir desde o começo, porque ele é a porta de entrada do valor do produto. Sem ele, o sistema vira apenas uma coleção de telas; com ele, o AI Company OS passa a se comportar como uma plataforma que entende a empresa antes de gerar qualquer coisa.[file:11]

## Encerramento

A ordem de execução acima organiza o produto de forma natural: primeiro entrar, depois entender a empresa, depois gerar com contexto, depois revisar e reaproveitar, e por fim automatizar e integrar. Essa é a sequência mais segura para transformar a visão do AI Company OS em uma experiência real e evolutiva.[file:11][file:10]
