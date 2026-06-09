> **LEGADO — TikTok Shop marketplace.** Não usar como fonte de verdade.
> Produto atual: [`docs/prd/blister-master-prd.md`](../../prd/blister-master-prd.md)

# PRD — Blister

## Visão geral

Este documento descreve o PRD da Blister, uma agência operada por software para live commerce no TikTok no Brasil. A proposta combina operação assistida e software, aproveitando o contexto de expansão do TikTok no país, a compra integrada dentro do app e o uso de criadores como alavanca comercial.[cite:8][cite:9][cite:7][cite:2][cite:6]

O produto nasce com tese de “agência operada por software”, porque o mercado ainda exige curadoria, treinamento, onboarding e operação ativa para garantir qualidade de execução e conversão. Esse posicionamento reduz o risco de um marketplace vazio e permite capturar demanda logo no início com operação concierge e dados próprios de performance.[cite:6][cite:9]

## Objetivo do produto

Construir uma plataforma operacional para:

- Conectar marcas a hosts aptos para live commerce, sob operação da agência.
- Organizar campanhas, agenda, briefing, contratação e execução das lives.
- Medir resultado por campanha, host e marca com foco em conversão, GMV e recorrência.
- Permitir evolução de uma operação assistida para um marketplace escalável com inteligência de matching.

## Problema

Empresas como Granado precisam de pessoas para fazer live commerce, mas não possuem área interna para isso. Ao mesmo tempo, hosts e criadores têm dificuldade para acessar demanda qualificada, estruturar portfólio, negociar cachê/comissão e operar dentro de um fluxo profissional.[cite:6][cite:9]

O TikTok Shop já combina vitrine, compra no feed, compra em LIVE, pesquisa e colaboração com afiliados, o que cria uma camada comercial potente, mas aumenta a necessidade de operação estruturada entre seller, criador e campanha.[cite:8][cite:7]

## Hipótese de produto

Se a plataforma reduzir o tempo para contratar um host adequado, padronizar a execução da live e organizar pagamentos e métricas, então marcas terão maior previsibilidade operacional e mais confiança para repetir campanhas. Em paralelo, hosts e criadores terão mais oportunidade de trabalho e melhor monetização, o que aumenta liquidez do lado da oferta.[cite:6][cite:7]

## Escopo do MVP

O MVP deve cobrir apenas os fluxos necessários para fechar, executar e medir campanhas.

### Incluído no MVP

- Cadastro e onboarding de marcas.
- Cadastro e onboarding de hosts/criadores.
- Perfil profissional com portfólio, nicho, disponibilidade e experiência.
- Criação de campanha/vaga de live commerce.
- Matching básico por filtros e score simples.
- Aplicação do host em campanhas e convite da marca.
- Agenda e confirmação de lives.
- Briefing operacional e checklist pré-live.
- Registro de cachê, comissão e status de pagamento.
- Dashboard simples com campanhas, lives realizadas e performance consolidada.

### Fora do MVP

- Match automatizado com IA avançada.
- Integração profunda com ERPs e gateways financeiros.
- Contratos eletrônicos complexos.
- App mobile nativo.
- Marketplace self-service totalmente aberto sem curadoria.
- Sistema de mídia paga e atribuição multicanal completo.

## Perfis de usuário

### 1. Marca / Seller

Empresa ou vendedor que deseja rodar lives no TikTok Shop para vender produtos, testar campanhas e contratar hosts ou criadores.

### 2. Host / Apresentador

Pessoa com habilidade de apresentação ao vivo, responsável por conduzir live commerce, explicar produto, interagir com audiência e ajudar a converter vendas.

### 3. Criador Afiliado

Perfil com capacidade de produção de conteúdo e potencial de conversão, podendo atuar em live ou em vídeos/ativos relacionados à campanha e criativos de afiliados.[cite:7]

### 4. Operador / Agência / Estúdio

Parceiro que apoia produção, roteiro, cenário, operação técnica da live, direção e suporte à marca.

### 5. Admin interno

Time responsável por curadoria, moderação, suporte, aprovação de perfis, resolução de conflitos e acompanhamento de KPIs.

## Proposta de valor

### Para marcas

- Reduzir tempo para encontrar host qualificado.
- Padronizar a execução de live commerce.
- Ter visibilidade de agenda, custo e performance.
- Operar com apoio consultivo e não apenas com uma lista de contatos.

### Para hosts e criadores

- Acessar oportunidades recorrentes.
- Organizar portfólio e reputação profissional.
- Trabalhar com mais previsibilidade de pagamento.
- Evoluir por ranking, avaliações e histórico de conversão.

### Para agências e estúdios parceiros

- Receber demanda estruturada.
- Operar com briefing padronizado.
- Ganhar recorrência regional e especialização por categoria.

## Fluxo de funcionamento

O funcionamento do produto deve seguir um fluxo operacional simples e previsível.

1. A marca cria conta e completa perfil da empresa.
2. A marca publica uma campanha de live commerce com categoria, objetivo, orçamento, comissão, formato e datas.
3. A plataforma sugere hosts/criadores compatíveis por nicho, experiência, disponibilidade e localização.
4. Hosts podem se candidatar e marcas também podem convidar talentos diretamente.
5. O time interno aprova combinações de maior risco ou alto ticket, quando necessário.
6. A marca fecha a campanha, envia briefing e agenda a live.
7. Host, marca e operador acompanham checklist pré-live.
8. A live acontece e a plataforma registra dados operacionais e comerciais.
9. O financeiro consolida cachê, comissão e repasses.
10. Todos os lados avaliam a experiência, alimentando ranking e futuras recomendações.

## Diagrama do fluxo principal

```text
[Marca/Seller]
    |
    v
[Cria conta e campanha]
    |
    v
[Matching de hosts/criadores]
    |------------------------------|
    v                              v
[Convite da marca]            [Aplicação do host]
    |                              |
    |--------------[Avaliação e aprovação]-----------|
                             |
                             v
                     [Fechamento da campanha]
                             |
                             v
                  [Briefing + agenda + checklist]
                             |
                             v
                        [Execução da live]
                             |
                             v
                  [Resultado + métricas + payout]
                             |
                             v
                    [Avaliação + ranking + retry]
```

## Jornadas principais

### Jornada 1 — Marca cria campanha e contrata host

- Marca faz cadastro.
- Marca completa perfil comercial.
- Marca cria campanha com dados do produto, categoria, metas, formato e budget.
- Sistema retorna lista de hosts elegíveis.
- Marca convida ou aprova candidatos.
- Campanha vai para status “fechada”.
- Briefing e agenda são compartilhados.
- Live é executada.
- Resultado e pagamento são processados.

### Jornada 2 — Host entra na plataforma e consegue trabalho

- Host faz cadastro.
- Host envia dados pessoais/profissionais, nichos, disponibilidade e portfólio.
- Admin aprova perfil, reprova ou solicita ajustes.
- Host visualiza campanhas compatíveis.
- Host se candidata.
- Marca seleciona o host.
- Host recebe briefing, executa live e acompanha repasse.

### Jornada 3 — Operação assistida pela agência

- Admin ou operador cria playbook da campanha.
- Checklist define setup, roteiro, oferta, cupons, assets e responsáveis.
- Operação acompanha execução e marca ocorrências.
- Pós-live consolida insights e recomenda próximas ações.

## Estrutura de telas

Abaixo está a estrutura mínima recomendada para o MVP.

### Área pública

1. Landing page.
2. Página “Como funciona”.
3. Cadastro de marca.
4. Cadastro de host/criador.
5. Login.

### Área da marca

1. Dashboard da marca.
2. Listagem de campanhas.
3. Criar/editar campanha.
4. Detalhe da campanha.
5. Busca e matching de hosts.
6. Caixa de candidaturas/convites.
7. Agenda/calendário.
8. Briefing operacional.
9. Financeiro/pagamentos.
10. Relatórios.
11. Configurações da conta/empresa.

### Área do host/criador

1. Dashboard do host.
2. Meu perfil profissional.
3. Portfólio e mídias.
4. Disponibilidade/calendário.
5. Campanhas disponíveis.
6. Minhas candidaturas.
7. Campanhas fechadas.
8. Briefing recebido.
9. Ganhos e repasses.
10. Avaliações e reputação.
11. Configurações.

### Área admin

1. Dashboard operacional.
2. Aprovação de marcas.
3. Aprovação de hosts.
4. Gestão de campanhas.
5. Moderação de ocorrências.
6. Gestão financeira.
7. Gestão de categorias, tags e filtros.
8. Relatórios consolidados.
9. Configuração de regras de score.

## Descrição das principais telas

### 1. Dashboard da marca

Deve mostrar visão resumida de campanhas ativas, próximas lives, talentos contratados, gastos previstos e resultado acumulado. É a tela de entrada para acompanhamento rápido da operação.

### 2. Criar campanha

Tela central do produto. Deve permitir definir nome da campanha, categoria, marca/produto, objetivo, formato da live, data desejada, cachê, comissão, cidade, necessidade de estúdio, briefing inicial e documentos/ativos.

### 3. Busca e matching de hosts

Tela com filtros por nicho, gênero de apresentação, disponibilidade, localização, experiência, faixa de cachê, ranking e performance histórica. Também deve exibir score de aderência calculado pela plataforma.

### 4. Perfil do host

Tela com bio profissional, nichos, experiências anteriores, indicadores, portfólio, vídeos, disponibilidade semanal, cidade, idiomas, formatos aceitos e avaliações.

### 5. Detalhe da campanha

Tela com resumo da vaga, status, talentos convidados/candidatos, briefing, agenda, arquivos e trilha operacional. Deve permitir trocar mensagens contextuais e acompanhar pendências.

### 6. Agenda

Calendário mensal/semanal com lives agendadas, responsáveis, conflitos de horário e status de confirmação. Deve existir para marca, host e admin.

### 7. Financeiro

Tela para visualizar cachês, comissões, repasses pendentes, valores aprovados, divergências e comprovantes. No MVP, pode operar com conciliação manual assistida.

### 8. Dashboard admin

Tela com funil operacional completo: novos cadastros, campanhas abertas, vagas sem match, lives do dia, incidentes, repasses pendentes e KPIs gerais.

## Regras de negócio

### Cadastro e aprovação

- Todo host deve passar por aprovação antes de aparecer publicamente para marcas.
- Marcas podem ter acesso imediato ou aprovação assistida, conforme política de risco.
- Perfis incompletos não podem se candidatar nem publicar campanha.

### Campanhas

- Toda campanha deve ter pelo menos: categoria, objetivo, data estimada, formato, budget e regra de remuneração.
- Campanhas podem estar nos status: rascunho, publicada, em seleção, fechada, em preparação, ao vivo, concluída, cancelada.
- Uma campanha só pode ir para “fechada” após aceite explícito entre as partes.

### Matching e candidatura

- Hosts só podem se candidatar a campanhas compatíveis com sua disponibilidade.
- A plataforma deve impedir dupla alocação em conflito de agenda para o mesmo host.
- A marca pode convidar host mesmo sem candidatura prévia.
- O sistema deve registrar motivo de recusa, cancelamento e no-show.

### Agenda e operação

- Toda live confirmada precisa ter checklist mínimo preenchido antes da execução.
- Lives com necessidade de estúdio devem indicar local, operador responsável e janela de montagem.
- Mudanças críticas em data, produto ou remuneração devem gerar reaceite das partes.

### Financeiro

- O repasse só pode ser liberado após validação de execução ou aceite administrativo.
- Divergências financeiras devem entrar em status de contestação.
- O sistema deve registrar separadamente cachê fixo, comissão variável e fee da plataforma/agência.

### Avaliações e reputação

- Marcas e hosts podem se avaliar após campanha concluída.
- Perfis com taxa alta de cancelamento ou no-show devem perder visibilidade no matching.
- Avaliações ofensivas ou suspeitas devem poder ser moderadas pelo admin.

## Requisitos funcionais

### Autenticação e acesso

- RF01: O sistema deve permitir cadastro e login de marca, host e admin.
- RF02: O sistema deve permitir recuperação de senha.
- RF03: O sistema deve controlar permissões por perfil de acesso.

### Perfil e onboarding

- RF04: O sistema deve permitir criação e edição de perfil da marca.
- RF05: O sistema deve permitir criação e edição de perfil profissional do host.
- RF06: O sistema deve permitir upload de portfólio, mídias e documentos.
- RF07: O sistema deve permitir aprovação, reprovação e solicitação de ajustes pelo admin.

### Campanhas

- RF08: O sistema deve permitir criar, editar, publicar e cancelar campanhas.
- RF09: O sistema deve permitir anexar briefing e ativos à campanha.
- RF10: O sistema deve permitir acompanhar status da campanha em tempo real.

### Matching e contratação

- RF11: O sistema deve permitir busca e filtro de hosts.
- RF12: O sistema deve calcular score básico de aderência entre campanha e host.
- RF13: O sistema deve permitir candidatura do host.
- RF14: O sistema deve permitir convite direto pela marca.
- RF15: O sistema deve permitir aceitar, recusar e cancelar participação.

### Agenda e operação

- RF16: O sistema deve oferecer calendário de lives por usuário e por campanha.
- RF17: O sistema deve detectar conflitos de agenda.
- RF18: O sistema deve permitir checklist operacional pré-live.
- RF19: O sistema deve registrar ocorrências operacionais da campanha.

### Financeiro

- RF20: O sistema deve registrar cachê, comissão e fee da plataforma.
- RF21: O sistema deve permitir alterar status de pagamento.
- RF22: O sistema deve gerar visão consolidada de repasses por campanha e por usuário.

### Métricas e reputação

- RF23: O sistema deve exibir métricas básicas por campanha.
- RF24: O sistema deve permitir avaliação bilateral entre marca e host.
- RF25: O sistema deve calcular reputação/ranking básico do host.

### Administração

- RF26: O sistema deve permitir gestão de categorias, tags e filtros.
- RF27: O sistema deve permitir moderação de contas, campanhas e avaliações.
- RF28: O sistema deve permitir exportação simples de relatórios operacionais.

## Requisitos não funcionais

- RNF01: O sistema deve ter interface responsiva para desktop e mobile.
- RNF02: O tempo de carregamento das telas críticas deve ser adequado para operação comercial cotidiana.
- RNF03: A arquitetura deve suportar crescimento modular por domínio, como matching, agenda e financeiro.
- RNF04: O sistema deve manter trilha de auditoria para alterações críticas, como campanha, agenda e pagamento.
- RNF05: Os dados pessoais e comerciais devem ser protegidos com autenticação segura e controle de acesso por perfil.
- RNF06: O sistema deve permitir observabilidade mínima com logs de erro, eventos operacionais e métricas de uso.
- RNF07: O sistema deve ser preparado para internacionalização futura, embora o MVP opere em português do Brasil.
- RNF08: O produto deve ser desenhado para fácil evolução de operação assistida para self-service gradual.

## Modelo de dados conceitual

Entidades principais:

- Usuário
- Marca
- Host
- Admin
- Campanha
- Candidatura
- Convite
- AgendaEvento
- Briefing
- Checklist
- Pagamento
- Avaliação
- Categoria
- Tag
- Ocorrência

Relações principais:

- Uma marca possui várias campanhas.
- Uma campanha possui várias candidaturas e convites.
- Um host pode participar de várias campanhas.
- Uma campanha possui um ou mais eventos de agenda.
- Uma campanha pode gerar vários registros financeiros.
- Uma campanha concluída pode gerar avaliações bilaterais.

## Critérios de sucesso do MVP

O MVP deve ser considerado validado quando demonstrar capacidade de operar campanhas reais com baixa fricção e repetição comercial.

KPIs iniciais sugeridos:

- Tempo médio entre publicação da campanha e primeiro match qualificado.
- Taxa de preenchimento de vagas.
- Taxa de comparecimento em lives agendadas.
- Número de campanhas concluídas por mês.
- Taxa de recompra de marcas.
- Receita por campanha intermediada.
- Percentual de hosts com pelo menos 2 campanhas concluídas.

## Roadmap sugerido

### Fase 1 — Concierge operacional

- Landing page.
- Cadastro básico.
- Banco de perfis.
- Campanhas e matching manual assistido.
- Agenda e briefing.
- Financeiro simples.

### Fase 2 — Plataforma operacional

- Dashboard por perfil.
- Matching por score.
- Reputação.
- Checklist operacional.
- Relatórios consolidados.

### Fase 3 — Escala

- Matching inteligente com histórico.
- Marketplace mais self-service.
- Rede de estúdios e operadores parceiros.
- Integrações com ferramentas externas e dados de performance mais avançados.

## Riscos principais

- Oferta insuficiente de hosts realmente bons no início.
- Marcas esperando resultado imediato sem maturidade operacional.
- Alto custo humano se a operação continuar totalmente manual por muito tempo.
- Dependência excessiva de processos externos do ecossistema TikTok Shop.
- Problemas de agenda, no-show e qualidade de apresentação afetarem a confiança da plataforma.[cite:7][cite:8]

## Direcionamento de produto

A recomendação é iniciar como um produto de operação assistida com software próprio, focado em velocidade de execução e construção de base qualificada dos dois lados do marketplace. O software deve nascer enxuto, mas com estrutura para evoluir em três pilares: matching, operação e monetização recorrente.[cite:6][cite:9][cite:2]
