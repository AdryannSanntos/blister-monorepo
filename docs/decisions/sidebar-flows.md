# Workana AI — Fluxos completos por item da sidebar

> Documento de referência de produto. Cada seção mapeia um item da sidebar com seu fluxo completo, telas, modais, variações e regras de navegação. Mantido alinhado com `execution-order.md` e `mvp-features.md`.

---

## Estrutura da sidebar

```
[Header] Workspace switcher
─ Dashboard
─ AGENTES (grupo)
  ├── Meus agentes
  ├── Gerar copy
  ├── Gerar imagem
  ├── Criar post
  ├── Adaptar conteúdo
  ├── Criar email
  ├── Histórico
  └── Créditos
─ EMPRESA (grupo)
  ├── Brain
  ├── Contexto
  ├── Design System
  └── Integrações
─ WORKSPACE (grupo)
  ├── Equipe
  ├── Permissões
  ├── Configurações
  └── Admin
[Footer] User card
```

---

## Header — Workspace Switcher

### Tela: seletor de workspaces

**Trigger:** clicar no card de workspace no header da sidebar.

**Comportamento:** abre um dropdown/popover sobreposto à sidebar com:

- Lista de todos os workspaces que o usuário participa
  - Avatar + nome + plano/seats
  - Indicador visual do workspace ativo (check ou highlight)
- Ação: "Criar novo workspace" → modal de criação
- Ação: "Gerenciar conta" → vai para `/account/settings`

**Variações:**
- Usuário com 1 workspace: mostra igualmente o seletor, mas sem lista adicional
- Usuário com múltiplos workspaces: lista completa com scroll
- Workspace inativo (suspenso/sem créditos): badge de aviso; seleção abre modal informativo

**Modal: Criar novo workspace**
- Campos: nome da empresa, slug (auto-gerado, editável), segmento (select)
- Validação inline de slug (unicidade via API)
- Submit → cria org, redireciona para onboarding wizard da nova org

**Permissão necessária:** nenhuma (qualquer usuário autenticado pode criar workspace próprio)

---

## Dashboard

**Rota:** `/dashboard`

### Tela principal

Visão geral operacional do workspace. Cards e métricas de uso.

**Seções:**
1. **Boas-vindas / status do Brain** — se brain não publicado, banner CTA → "Completar Brain"
2. **Execuções recentes** — últimas 5 runs de agentes, link para histórico completo
3. **Uso de créditos** — barra de progresso com saldo atual vs. limite do plano
4. **Agentes rápidos** — atalhos para os agentes mais usados (Copy, Post, Adaptar, Imagem)
5. **Equipe** — membros online / membros com convites pendentes

**Variações:**
- **Workspace recém-criado (sem brain publicado):** exibe tela de onboarding incompleto com checklist de setup: Brain, Equipe, Integrações
- **Sem créditos:** banner de alerta destacado no topo, CTA para planos/recarga
- **Membro sem permissões especiais:** oculta seções de equipe e créditos, exibe apenas execuções próprias

**Navegação de saída:** todos os CTA cards levam para a seção correspondente da sidebar.

---

## Design System

**Rota:** `/dashboard/workspace/design-system`

Domínio visual da empresa, separado de `Contexto`. Concentra identidade, grupos de cores, assets oficiais de marca e notas visuais para a IA.

**Abas:**
- `Cores`: tabela de grupos de cores e edição de tokens com papel semântico, uso e restrições
- `Assets`: tabela de logos, guidelines e referências visuais com upload via URL pré-assinada para S3
- `Identidade`: formulário estruturado para essência de marca, percepção desejada, estilo visual, anti-padrões, referências e notas para IA

**Permissões:**
- `design-system.read` para ver a rota e dados
- `design-system.update` para editar identidade, cores, assets e regenerar `design-system.md`

**Sincronização IA:** toda alteração relevante persiste no banco e enfileira regeneração assíncrona do artifact `organizations/<orgId>/design-system/design-system.md`.

---

## GRUPO: Agentes

> Os agentes são o coração do produto. Toda geração de conteúdo, imagem ou adaptação acontece através de um agente. Agentes default do sistema (Adapta, Copy, Post, Imagem, Email) são instâncias pré-configuradas com workflow declarativo. A empresa pode criar agentes próprios além dos defaults.

### Meus agentes

**Rota:** `/dashboard/agents`

**Tela: catálogo de agentes**

Lista de todos os agentes disponíveis no workspace, em tabela (TanStack Table).

**Colunas:** nome, tipo (sistema / custom), último uso, custo médio/run, status (ativo/inativo).

**Ações disponíveis:**
- Executar agente → abre tela de execução (run screen)
- Ver histórico do agente → filtra histórico para aquele agente
- Criar agente customizado (se `agent.create` permitido) → modal/wizard de criação

**Modal: Criar agente customizado**

Wizard em steps:
1. **Identidade** — nome, descrição, ícone (emoji picker)
2. **Modelo** — seletor de provider (OpenAI, Anthropic, Groq…) + model id; custo estimado por run
3. **Sistema prompt** — textarea com variáveis disponíveis (`{{brain.name}}`, `{{brain.tone}}`, `{{input}}`)
4. **Workflow** — builder visual de steps:
   - Step types: `classify`, `generate`, `transform`, `review`, `output`
   - Cada step: modelo próprio opcional, prompt, input mapping, output schema
5. **Teste** — campo de input livre, executa dry-run sem debitar créditos, exibe output estruturado
6. **Publicar** — ativa agente no workspace

**Permissão:** `agent.create` para criar; `agent.read` para listar.

---

### Gerar copy

**Rota:** `/dashboard/agents/copy` (execução direta do agente Copy)

**Tela: run screen do agente Copy**

**Layout:** painel dividido — formulário de input à esquerda, output à direita.

**Formulário de input:**
- **Tipo de copy** (select): headline, CTA, descrição de produto, bio, caption, assunto de email, outro
- **Produto/serviço** (text): o que está sendo anunciado
- **Público-alvo** (text): para quem
- **Tom** (select, pré-preenchido com brain.tone): direto, emocional, técnico, descontraído, urgente
- **Plataforma** (multi-select): Instagram, LinkedIn, Google Ads, landing page, email
- **Referências** (textarea, opcional): exemplos de copies que o usuário gosta
- **Variações** (slider 1–5): quantas versões gerar

**Comportamento de execução:**
1. Usuário preenche o formulário
2. Clica "Gerar" → loading state com step tracker (classificando → gerando → revisando → pronto)
3. Output renderizado: cards de variação, cada um com o texto e ações (copiar, editar, salvar, adaptar)

**Ações no output:**
- **Copiar** → copia para clipboard
- **Editar inline** → torna o card editável
- **Salvar** → salva no histórico como output nomeado
- **Adaptar** → abre run screen de Adaptar Conteúdo com este output como input pré-preenchido
- **Criar post** → abre run screen de Criar Post com este copy como input
- **Regenerar variação** → reexecuta só aquele card

**Variações de estado:**
- Sem créditos suficientes → botão "Gerar" bloqueado, tooltip com saldo e CTA para recarregar
- Brain não publicado → banner de aviso acima do form ("Brain incompleto — suas saídas serão genéricas")
- Erro de execução → toast de erro + botão "Tentar novamente" + link para suporte

**Permissão:** `skill.execute`

---

### Gerar imagem

**Rota:** `/dashboard/agents/image`

**Tela: run screen do agente Imagem**

**Formulário de input:**
- **Descrição** (textarea): o que deve aparecer na imagem
- **Estilo** (select + thumbnails): fotografia, ilustração flat, 3D, pixel art, minimalista, produto
- **Proporção** (select): 1:1, 16:9, 9:16, 4:3
- **Provider** (select, se mais de um configurado): Flux, SDXL, GPT-Image
- **Prompt assistido** (toggle): quando ativo, envia a descrição para o agente que refina o prompt antes de gerar
- **Variações** (1–4)
- **Referência visual** (upload, opcional): imagem de referência de estilo

**Comportamento de execução:**
1. Clica "Gerar imagem"
2. Step tracker: planejando prompt → gerando → pós-processando → pronto
3. Output: grid de imagens geradas

**Ações no output:**
- **Download** (PNG/JPG, resolução original)
- **Ampliar** → lightbox com zoom
- **Regenerar** → mantém todos os parâmetros, nova seed
- **Variar** → abre mesmo form com imagem como referência
- **Usar em post** → abre Criar Post com imagem pré-anexada
- **Salvar no histórico**

**Variações:**
- Provider offline → aviso inline com opção de trocar provider
- Imagem bloqueada por safety filter → mensagem explicativa, botão "Ajustar prompt"

**Permissão:** `skill.execute`

---

### Criar post

**Rota:** `/dashboard/agents/post`

**Tela: run screen do agente Post**

**Formulário de input:**
- **Tema/assunto** (textarea): do que trata o post
- **Plataforma** (select): Instagram, LinkedIn, Twitter/X, Facebook, TikTok
- **Objetivo** (select): engajamento, tráfego, branding, vendas, educação
- **Formato** (select): texto único, carrossel (define número de slides), reels (script)
- **Incluir criativo** (toggle): se ativo, gera sugestão de imagem junto com o texto
- **Tom** (herdado do brain, editável)
- **Hashtags** (toggle + campo): incluir/excluir, sugestões automáticas

**Comportamento de execução:**
1. "Criar post" → step tracker: planejando → redigindo texto → gerando criativo (se ativo) → montando → pronto
2. Output estruturado:
   - **Texto do post** com preview do formato (simulação de card Instagram, LinkedIn, etc.)
   - **Sugestão de imagem** (prompt + imagem gerada se toggle ativo)
   - **Hashtags sugeridas** (chips clicáveis para adicionar/remover)
   - Para carrossel: slides individuais editáveis

**Ações no output:**
- Copiar texto
- Copiar imagem
- Editar slide/texto inline
- Adaptar para outra plataforma → Adaptar Conteúdo pré-preenchido
- Salvar no histórico
- **Agendar** (feature futura) → badge "Em breve"

**Permissão:** `skill.execute`

---

### Adaptar conteúdo

**Rota:** `/dashboard/agents/adapt`

**Tela: run screen do agente Adapta**

**Formulário de input:**
- **Conteúdo de origem** (textarea ou upload de .txt/.docx): texto a ser adaptado
- **De** (select): plataforma/formato de origem — ou "livre" se não se aplica
- **Para** (multi-select): plataformas/formatos de destino (pode adaptar para vários de uma vez)
- **Tipo de adaptação** (checkboxes):
  - Mudar plataforma (Instagram → LinkedIn)
  - Mudar tom (formal → descontraído)
  - Resumir
  - Expandir
  - Traduzir (select de idioma destino)
  - Reescrever mantendo estrutura
- **Preservar** (checkboxes): emojis, hashtags, menções, CTAs

**Comportamento de execução:**
- Para cada destino selecionado, gera um output separado (tabs ou cards)

**Output:**
- Tabs por plataforma/formato destino
- Em cada tab: texto adaptado + diff visual (mudanças destacadas) + ações (copiar, editar, salvar)

**Variações:**
- Conteúdo muito longo → aviso de estimativa de custo antes de executar
- Múltiplas plataformas → custo exibido por destino + custo total

**Permissão:** `skill.execute`

---

### Criar email

**Rota:** `/dashboard/agents/email`

**Tela: run screen do agente Email**

**Formulário de input:**
- **Tipo de email** (select): newsletter, cold outreach, follow-up, transacional, nurture, lançamento
- **Objetivo** (texto): o que o email deve fazer
- **Para** (texto): descrição do destinatário / segmento
- **Tom** (select, herdado do brain)
- **CTA principal** (texto): o que o leitor deve fazer após ler
- **Extensão** (select): curto (< 150 palavras), médio (150–300), longo (> 300)
- **Incluir assunto** (toggle): gera múltiplas sugestões de subject line com score de abertura estimado
- **Incluir preview text** (toggle)

**Output:**
- Card com subject line + preview text + corpo do email com formatação (negrito, listas, CTA button)
- Alternativas de subject line ranqueadas
- Ações: copiar HTML, copiar texto puro, editar inline, salvar, adaptar

**Permissão:** `skill.execute`

---

### Histórico

**Rota:** `/dashboard/agents/history`

**Tela: histórico de execuções**

Tabela (TanStack Table) com todas as execuções `AgentRun` do workspace (ou do usuário, dependendo de permissão).

**Colunas:** agente, usuário, data/hora, status (sucesso/erro/em andamento), créditos gastos, ações.

**Filtros (sidebar de filtros ou toolbar):**
- Por agente (multi-select)
- Por usuário (multi-select, visível para admin)
- Por status
- Por período (date range picker)
- Por custo (range slider)

**Ordenação:** todas as colunas, padrão: mais recente primeiro.

**Ações por linha:**
- Ver detalhes → abre drawer/modal de detalhe da execução

**Modal: Detalhe da execução**
- Input enviado
- Output gerado (renderizado, não texto bruto)
- Steps do workflow executados com timestamp e duração de cada um
- Créditos debitados (breakdown por step)
- Status de cada step (sucesso / erro / pulado)
- Botão "Executar novamente" → pré-preenche o form do agente com o mesmo input

**Variações:**
- Execução com erro → step com erro destacado em vermelho, mensagem de erro expandível
- Execução em andamento → row com spinner, polling de status

**Permissão:** `output.read` para ver execuções próprias; admin vê de toda a equipe.

---

### Créditos

**Rota:** `/dashboard/agents/credits`

**Tela: painel de créditos**

**Seções:**

1. **Saldo atual**
   - Saldo da empresa (pool principal)
   - Saldo do usuário (subconta, se configurada pelo admin)
   - Previsão de duração baseada no uso médio dos últimos 30 dias

2. **Consumo por período** — gráfico de barras diário (Recharts), com breakdown por agente

3. **Top consumidores** — tabela: usuário × agentes × créditos gastos no período

4. **Histórico do ledger** — tabela append-only: data, tipo (débito / crédito / reserva / liberação), referência (run id), valor

5. **Planos e recarga** — cards de plano atual + botão "Recarregar" / "Fazer upgrade"

**Modal: Recarregar créditos**
- Seleção de pacote (créditos e preço)
- Resumo + checkout (integração Stripe futura)

**Modal: Definir quota de usuário** (apenas admin)
- Seletor de usuário + campo de quota mensal

**Permissão:** qualquer membro vê o próprio saldo; `credit.read` para ver toda a empresa; `credit.manage` para recarregar e definir quotas.

---

## GRUPO: Empresa

### Brain

**Rota:** `/dashboard/workspace/brain` (hoje aponta para `/onboarding`)

> O Brain é o contexto persistido da empresa. Ele é injetado como system prompt nos agentes default. Um brain bem preenchido melhora a qualidade de todos os outputs gerados.

**Tela: visão do Brain publicado**

Exibido quando o brain já foi publicado ao menos uma vez.

**Seções:**
- **Status** — publicado em / versão / badge "Ativo"
- **Resumo dos dados** — cards por categoria (empresa, produtos, público, tom, diferenciais)
- **Uso** — quantas execuções de agentes usaram este brain

**Ação principal:** "Editar Brain" → abre wizard de edição (mesmo do onboarding, pré-preenchido)

**Tela: Brain incompleto / não publicado**

Banner CTA: "Seu brain ainda não foi publicado. Complete agora para melhorar seus resultados."

Botão → abre wizard de onboarding/brain.

**Wizard do Brain** (edição / onboarding)

Steps (barra de progresso no topo):

1. **Básicos** — nome da empresa, segmento, site, redes sociais
2. **Produtos/serviços** — lista de produtos principais (nome + descrição curta), adicionar/remover
3. **Público-alvo** — personas: nome, cargo/perfil, dor principal, objetivo (múltiplas personas)
4. **Posicionamento** — proposta de valor, principais concorrentes, diferencial competitivo
5. **Processos** — como a empresa trabalha, metodologias, restrições operacionais
6. **Tom de voz** — seleção de adjetivos (chips), exemplos de comunicação boa e ruim (textareas)
7. **Diferenciais** — o que a empresa faz que ninguém mais faz, cases de sucesso (opcional)
8. **Revisão** — preview de todos os dados, botão "Publicar Brain"

**Comportamentos:**
- Draft salvo automaticamente a cada step (não perde dados ao fechar)
- "Publicar Brain" cria `CompanyBrain` persistido; draft continua existindo para próximas edições
- Após publicar: redirecionado para tela do Brain com status "Ativo"

**Variações:**
- Membro sem permissão de edição → wizard em modo read-only
- Brain com edição em andamento (draft ≠ publicado) → banner "Você tem alterações não publicadas"

**Permissão:** `brain.read` para ver; `brain.update` para editar/publicar.

---

### Contexto

**Rota:** `/dashboard/workspace/assets`

> Contexto é a biblioteca operacional usada para reunir fontes que ajudam a IA a entender a empresa. Nesta fase, a rota reaproveita a fundação existente de assets, mas a leitura de produto deve ser `Contexto`: o foco principal são fontes de contexto; a parte visual/de marca migra para `Design System`.

**Tela: visão de contexto da empresa**

**Seções:**
- **Resumo** — volume de fontes cadastradas, categorias visíveis e status de processamento
- **Tabela principal** — coleção das fontes contextualizadoras do workspace
- **Ações rápidas** — adicionar fonte de contexto, abrir detalhe, revisar metadata

**Comportamentos:**
- A navegação lateral exibe o item como `Contexto`, não mais `Contexto e assets`
- A biblioteca continua suportando materiais operacionais já existentes enquanto a separação de domínio não é concluída
- O posicionamento visual e de marca deixa de pertencer a esta feature e passa a ser responsabilidade de `Design System`

**Variações:**
- Usuário sem `asset.read` vê estado de permissão negada
- Workspace sem fontes cadastradas mostra empty state com CTA para adicionar a primeira fonte

**Permissão:** `asset.read` para ver; `asset.create/update/archive/context.review` para gerir a biblioteca.

---

### Design System

**Rota planejada:** item visível na sidebar como `Em breve` por enquanto.

> Design System passa a ser a feature responsável por todo o gerenciamento de contexto visual da empresa: identidade, referências de marca, direção estética e assets que servem de base para outputs visuais.

**Escopo de produto esperado:**
- identidade visual da empresa
- assets de marca e referências visuais
- regras de uso de logo, cores, tipografia e estilos
- contexto para geração de imagem, peças e criativos

**Comportamento inicial:**
- item novo no grupo `Empresa`
- sem rota funcional nesta fase
- click abre feedback de `Em breve`

**Permissão inicial:** a definir quando a tela for implementada; por enquanto o item é apenas navegacional.

---

### Integrações

**Rota:** `/dashboard/workspace/integrations`

**Tela: catálogo de integrações**

Grid de cards, cada card representando um conector disponível.

**Card de integração:**
- Logo + nome + descrição de 1 linha
- Status: "Conectado" (verde) / "Não conectado" / "Erro de conexão" (vermelho)
- Botão: "Conectar" / "Gerenciar" / "Reconectar"

**Categorias de integrações (tabs ou filtro lateral):**
- Redes sociais (Instagram, Facebook, LinkedIn, Twitter/X, TikTok)
- Email marketing (Mailchimp, ActiveCampaign, RD Station)
- CRM (HubSpot, Pipedrive)
- Armazenamento (Google Drive, Dropbox)
- Analytics (GA4, Meta Pixel)
- Outros

**Fluxo: Conectar integração (OAuth)**

1. Clica "Conectar" no card
2. **Modal de confirmação** — explica o que será autorizado (escopos), botão "Continuar"
3. Redirecionamento para OAuth do provider
4. Callback → retorno ao app, polling de status
5. **Modal de sucesso** — "Integração conectada! O que deseja fazer agora?" com CTA contextuais (ex: "Publicar post no Instagram")
6. Card atualiza para status "Conectado"

**Fluxo: Gerenciar integração conectada**

Abre drawer lateral com:
- Nome da conta conectada (ex: @empresa no Instagram)
- Data de conexão
- Permissões autorizadas
- Botão "Reconectar" (refresh do token)
- Botão "Desconectar" → modal de confirmação destrutiva

**Fluxo: Erro de conexão**

Card com badge vermelho "Erro". Ao clicar "Reconectar":
- Verifica se token expirou → OAuth novamente
- Verifica se permissões foram revogadas → modal explicativo com passos para re-autorizar

**Variações:**
- Integração em manutenção pelo provider → card com badge "Indisponível temporariamente"
- Integração não suportada no plano atual → card com badge "Upgrade necessário" + CTA

**Permissão:** `integration.read` para ver; `integration.manage` para conectar/desconectar.

---

## GRUPO: Workspace

### Equipe

**Rota:** `/dashboard/workspace/team`

**Tela: listagem de membros**

Tabela (TanStack Table) com todos os membros do workspace.

**Colunas:** avatar + nome, email, roles (chips), último acesso, status (ativo / pendente), ações.

**Ações da toolbar:**
- "Convidar membro" → modal de convite
- Filtro por role
- Filtro por status
- Busca por nome/email

**Ações por linha:**
- Editar roles → drawer de edição de roles do membro
- Remover membro → modal de confirmação

**Modal: Convidar membro**
- Campo de email (multi-email: pode convidar vários de uma vez separados por vírgula)
- Seleção de roles (multi-select com roles disponíveis)
- Botão "Enviar convites"
- Estado de sucesso: lista de emails com status (enviado / já é membro / inválido)

**Drawer: Editar membro**
- Nome e email (read-only)
- Roles atuais: chips com X para remover
- Adicionar role: combobox de roles disponíveis
- Regra: não pode remover todos os owners (backend valida)
- Botão "Salvar"

**Modal: Remover membro**
- Aviso sobre o que acontece (perde acesso imediato, execuções históricas são mantidas)
- Para owner: aviso extra "Esta ação é irreversível"
- Confirmação por digitação do email (se for owner)

**Aba: Convites pendentes**
- Tabela de convites: email, roles, enviado em, expira em, status
- Ações: reenviar email, revogar convite

**Permissão:** `member.read` para ver; `member.invite` para convidar; `member.update` para editar roles; `member.remove` para remover.

---

### Permissões

**Rota:** `/dashboard/workspace/permissions`

**Tela: gerenciamento de roles e permissões**

Duas seções em tabs:

**Tab: Roles**

Tabela de roles do workspace: roles de sistema (owner, admin, member) + roles customizadas.

Colunas: nome, tipo (sistema / custom), membros com esta role, permissões (count), ações.

Ações:
- Criar role customizada → modal de criação
- Editar role customizada → drawer de edição
- Excluir role customizada → modal de confirmação (só se nenhum membro tiver esta role ativa)
- Roles de sistema: somente leitura

**Modal/Drawer: Criar / Editar role**
- Nome da role
- Descrição (opcional)
- Mapa de permissões: lista completa do catálogo de permissões agrupada por domínio (checkboxes)
  - Domínios: Empresa, Membros, Roles, Brain, Agentes, Créditos, Integrações, Outputs
- Preview: "Esta role poderá…" — lista human-readable das permissões selecionadas
- Botão "Salvar"

**Tab: Permissões**

Visualização matricial: rows = permissões, columns = roles. Células com check/cross.

Permite entender rapidamente quem pode fazer o quê.

Filtro por domínio de permissão.

**Permissão:** `role.read` para ver; `role.create/update/delete` para gerenciar.

---

### Configurações

**Rota:** `/dashboard/workspace/settings`

**Tela: configurações do workspace**

Formulário dividido em seções (scroll ou tabs laterais):

**Seção: Informações da empresa**
- Nome da empresa
- Slug (editável com aviso de impacto em URLs)
- Logo (upload de imagem)
- Site
- Segmento/indústria
- Fuso horário padrão

**Seção: Aparência**
- Tema padrão do workspace (light / dark / seguir sistema)

**Seção: Notificações**
- Email de notificações de convites (toggle)
- Email de relatório semanal de uso (toggle)
- Notificações de execuções com erro (toggle + threshold)

**Seção: Segurança**
- Exigir 2FA para todos os membros (toggle, apenas owner)
- Tempo de sessão (select: 7 dias / 30 dias / 90 dias)
- Lista de IPs permitidos (feature futura, badge "Em breve")

**Seção: Zona de perigo**
- "Exportar todos os dados do workspace" → gera ZIP assíncrono, notifica por email
- "Excluir workspace" → modal de confirmação com digitação do nome + aviso sobre irreversibilidade

**Modal: Confirmar exclusão de workspace**
- Aviso: todos os dados, execuções, brain, membros e créditos serão removidos
- Campo: digitar o nome do workspace para confirmar
- Botão vermelho "Excluir permanentemente"

**Permissão:** `company.read` para ver; `company.update` para editar; `company.delete` para excluir.

---

### Admin

**Rota:** `/dashboard/admin`

> Painel restrito a admins globais da Workana AI (não admins de empresa). Acessível apenas para membros da empresa admin (`isAdminCompany = true`) com role de admin global.

**Tela: painel admin global**

**Seções em tabs:**

**Tab: Workspaces**
- Tabela de todas as organizações: nome, plano, seats, créditos totais, uso mensal, status
- Busca por nome/slug
- Ações: ver detalhes, suspender, reativar, deletar

**Drawer: Detalhe do workspace**
- Informações gerais
- Membros
- Uso de créditos (gráfico)
- Feature flags ativas
- Botões de ação administrativa

**Tab: Usuários**
- Tabela de todos os usuários: nome, email, workspaces, último login, status
- Ações: ver detalhe, banir, resetar senha

**Tab: Métricas globais**
- Cards: total de runs hoje/semana/mês, créditos consumidos, usuários ativos
- Gráficos de tendência (Recharts)
- Breakdown por agente, por workspace

**Tab: Modelos de IA**
- Tabela de providers e modelos habilitados: provider, model id, custo/token, habilitado (toggle), limite de uso
- Adicionar modelo → modal
- Editar custo/limite → inline edit

**Tab: Feature Flags**
- Tabela de flags: key, descrição, default (toggle global)
- Por workspace: search + toggle override
- Por usuário: search + toggle override

**Tab: Logs de auditoria**
- Tabela de eventos de domínio: timestamp, tipo de evento, entidade, ator, workspace
- Filtros: tipo de evento, período, workspace, usuário
- Detalhe do evento → drawer com payload completo

**Tab: Notificações de sistema**
- Criar notificação broadcast
  - Destinatário: todos / por plano / por workspace específico
  - Canal: in-app / email / ambos
  - Mensagem + CTA (opcional)
  - Agendar ou enviar imediatamente

**Permissão:** guard dedicado `@AdminOnly()` — não reaproveita `@RequirePermission`.

---

## Footer — User Card

### Tela: menu do usuário

**Trigger:** clicar no card de usuário no footer da sidebar (ou no ícone de settings ao lado).

**Abre dropdown/popover com:**

- **Cabeçalho:** avatar + nome + email + role no workspace atual
- **Conta**
  - Configurações da conta → `/account/settings`
  - Meus workspaces → `/account/workspaces`
- **Aparência**
  - Toggle de tema (light / dark / sistema)
- **Suporte**
  - Central de ajuda (link externo)
  - Reportar problema → modal de feedback
- **Sair** → logout, redireciona para `/login`

**Rota: `/account/settings`**

Configurações pessoais do usuário:

**Seção: Perfil**
- Nome completo
- Avatar (upload)
- Email (exige re-autenticação para mudar)
- Fuso horário pessoal

**Seção: Segurança**
- Trocar senha (campo senha atual + nova senha + confirmação)
- Ativar 2FA (QR code + código de confirmação)
- Sessões ativas (tabela com device/browser/IP, botão "Encerrar" por sessão)

**Seção: Notificações pessoais**
- Preferências de email por tipo de evento

**Rota: `/account/workspaces`**

- Lista de todos os workspaces que o usuário participa
- Role em cada workspace
- Botão "Sair do workspace" (com confirmação; não disponível se for o único owner)
- Botão "Criar workspace"

---

## Fluxos transversais

### Fluxo: primeira utilização (new user journey)

```
Signup
  └── Verificação de email
        └── Criar workspace (obrigatório)
              └── Wizard Brain (steps 1-7, pode pular)
                    └── Dashboard (com checklist de setup se brain não publicado)
```

### Fluxo: aceitar convite

```
Link de convite no email
  └── Se não autenticado → Login / Signup
        └── Confirmação de entrada no workspace
              └── Dashboard do workspace convidado
```

### Fluxo completo de execução de agente

```
Usuário acessa run screen do agente
  └── Preenche formulário
        └── Clica "Executar"
              ├── Sistema verifica saldo de créditos
              │     └── Saldo insuficiente → modal de recarga → bloqueio
              ├── Pré-débito reservado no CreditLedger
              ├── Step tracker: classify → generate → [steps do workflow] → output
              │     └── Erro em qualquer step → liberação da reserva + toast de erro
              └── Output renderizado
                    ├── Débito confirmado no CreditLedger
                    ├── AgentRun salvo no histórico
                    └── Ações disponíveis (copiar, salvar, adaptar, etc.)
```

### Fluxo: automação (agentes em fluxo)

> Automações são agentes default do sistema rodando em sequência orquestrada. Não é um módulo separado — é uma configuração de workflow que encadeia agentes.

```
Trigger (manual / agendado / webhook / evento de integração)
  └── Agente 1 executa (ex: Adaptar conteúdo de blog post)
        └── Output alimenta Agente 2 (ex: Criar post para Instagram)
              └── Output alimenta Agente 3 (ex: Criar post para LinkedIn)
                    └── Resultado final disponível no histórico
                          └── (opcional) Publicar via integração conectada
```

**Tela: Automações** (feature futura, acessível via sidebar quando implementada)
- Lista de automações configuradas
- Criar automação → wizard:
  1. Escolher trigger (manual / schedule / webhook)
  2. Adicionar steps (seletor de agente + mapeamento de input/output entre steps)
  3. Testar fluxo com dry-run
  4. Ativar

---

## Regras de permissão por item

| Item da sidebar  | Permissão mínima         | Visível para `member`? |
|------------------|--------------------------|------------------------|
| Dashboard        | autenticado              | ✅                     |
| Meus agentes     | `skill.read`             | ✅                     |
| Gerar copy       | `skill.execute`          | ✅                     |
| Gerar imagem     | `skill.execute`          | ✅                     |
| Criar post       | `skill.execute`          | ✅                     |
| Adaptar conteúdo | `skill.execute`          | ✅                     |
| Criar email      | `skill.execute`          | ✅                     |
| Histórico        | `output.read`            | ✅ (só próprio)        |
| Créditos         | autenticado (saldo)      | ✅ (só próprio)        |
| Brain            | `brain.read`             | ✅ (read-only)         |
| Contexto         | `asset.read`             | ✅ (se concedido)      |
| Design System    | a definir                | ✅                     |
| Integrações      | `integration.read`       | ✅                     |
| Equipe           | `member.read`            | ❌ (admin+)            |
| Permissões       | `role.read`              | ❌ (admin+)            |
| Configurações    | `company.read`           | ❌ (admin+)            |
| Admin            | guard `@AdminOnly()`     | ❌                     |
