# Blister — Plano de Execução do Produto

> Documento de design/spec. Data: 2026-06-04.
> Base: `Blister PRD TikTok Shop.md` + `CLAUDE.md` (regras invioláveis) + estado atual do monorepo.
> Princípio guia: **Regra 9 — simplicidade radical**. O software organiza e registra; no início, a operação humana (concierge) faz o trabalho pesado de matching e curadoria.

---

## 1. Estado atual (ponto de partida)

**Já existe (fundação técnica limpa):**

- Auth completo (better-auth): login, signup, verificação de email, forgot/reset password.
- `userType` no schema: `MARCA`, `HOST`, `CRIADOR`, `OPERADOR`, `ADMIN`, `USER`.
- Sistema de roles + permissões CASL (`packages/authz`) — catálogo ainda genérico (`user.*`, `member.*`, `role.*`, `permission.*`, `context.read`, `design-system.read`).
- Área admin/platform: `PlatformRoleAssignment`, `SupportSession`, `AuditLog`.
- Dashboard shell (`/dashboard/(shell)`) com workspace (settings, team, permissions) e account settings.
- Componentes base: `<DataTable>`, `<PermissionGate>`, `useAbility()`, proxy de rotas (`/dashboard/*` e `/auth/*`).

**Não existe (todo o domínio Blister):**

- Nenhum modelo de Marca, Criador, Campanha, Candidatura, Convite, Agenda, Briefing, Checklist, Pagamento, Categoria.
- Nenhuma permissão de negócio no `packages/authz`.
- Nenhum onboarding por perfil, storage de mídia, ou notificações.

---

## 2. Decisões de produto (travadas)

| Tema | Decisão |
|------|---------|
| Cadastro | Signup genérico (email/senha). Perfil escolhido no **onboarding** (`userType` fica `USER` até a escolha). |
| Perfis no MVP | **Marca** e **Criador**. "Host/apresentador" e "afiliado/conteúdo" são **capacidades/tags** do mesmo perfil Criador. Operador/Estúdio → Fase 2. |
| Aprovação | **Marca e Criador** passam por aprovação admin antes de operar (publicar campanha / aparecer no matching). |
| Storage | Upload real via **S3-compatível + presigned URL** (provedor concreto definido na implementação; abstração `StorageService`). |
| Notificações | **In-app (sino) + email (Resend)** nos eventos críticos. |
| Matching | MVP = lista filtrável **sem score**. Fase 2 = score de aderência. Fase 3 = inteligente com histórico. |
| Financeiro | MVP = **registro manual** (cachê fixo + comissão variável + fee da plataforma, separados) + status de pagamento. Sem gateway. |
| Métricas de live (GMV, conversão) | **Input manual** no MVP. Integração TikTok Shop (fonte automática) → Fase 3. |
| 1 perfil por usuário | Cada usuário tem **um** `userType` (regra do CLAUDE.md). Sem perfil duplo. |
| Chat contextual | Fase 2. |

---

## 3. Princípios de implementação (não-negociáveis)

Toda etapa obedece às regras do `CLAUDE.md`:

1. **Toda ação tem permissão.** Backend: `@RequirePermission(key)`. Frontend: `<PermissionGate>` / `useAbility()`.
2. **`userId` vem de `req.currentUser.id`**, nunca do body. IDs de recurso vêm de `req.params`.
3. **Novo endpoint** com guard ou `@Public()` explícito.
4. **Nova permissão → `packages/authz` primeiro** (declarar chave, mapa, roles padrão, seed), depois usar no controller e no frontend.
5. **Prisma é o único cliente de banco.**
6. **better-auth só trata auth/sessão.** Perfil e acesso são domínio da aplicação.
7. **Dados em `<DataTable>`** com sort, filtros, seleção, export e floating footer.
8. **Simplicidade radical** (Regra 9): no máximo 2–3 campos para iniciar qualquer tarefa.
9. **Animações** (`tw-animate-css`) e **espaçamento padronizado** (24px entre grupos, 16px dentro).
10. **Auditoria** (`AuditLog`) em alterações críticas: campanha, agenda, pagamento, aprovação.

---

## 4. Modelo de dados (visão consolidada)

Enum de status e entidades centrais. Detalhamento por fase nas seções 6–8.

```
UserType (já existe): MARCA | HOST | CRIADOR | OPERADOR | ADMIN | USER
  → No MVP usamos MARCA e CRIADOR. HOST permanece no enum mas não é fluxo separado.

OnboardingStatus: PENDENTE | EM_ANALISE | APROVADO | REPROVADO | AJUSTES_SOLICITADOS

CampanhaStatus (MVP enxuto): RASCUNHO | ABERTA | FECHADA | CONCLUIDA | CANCELADA
  → Fase 2 expande: EM_SELECAO, EM_PREPARACAO, AO_VIVO.

CandidaturaStatus: PENDENTE | ACEITA | RECUSADA | CANCELADA
ConviteStatus:     ENVIADO | ACEITO | RECUSADO | CANCELADO
PagamentoStatus:   PENDENTE | APROVADO | PAGO | EM_CONTESTACAO
```

Entidades MVP: `MarcaProfile`, `CriadorProfile`, `Categoria`, `Campanha`, `CampanhaAsset`, `Candidatura`, `Convite`, `LiveEvento` (agenda), `Briefing`, `ChecklistItem`, `RegistroFinanceiro`, `Notificacao`.

---

## 5. Fase 0 — Fundação de domínio (pré-requisito transversal)

Antes de qualquer fluxo de negócio. Não entrega tela de produto, mas habilita todas as etapas.

### 5.1 Permissões de negócio (`packages/authz`)

Declarar em `AppPermissionKey`, `allPermissionKeys`, `permissionMap` e nas roles padrão:

```
marca.read | marca.update | marca.approve
criador.read | criador.update | criador.approve
campanha.read | campanha.create | campanha.update | campanha.publish | campanha.cancel
candidatura.read | candidatura.create | candidatura.update
convite.read | convite.create | convite.update
agenda.read | agenda.update
briefing.read | briefing.update
financeiro.read | financeiro.update
notificacao.read
admin.dashboard.read | categoria.manage
```

Mapear cada chave para `[AppAction, AppSubject]` (novos subjects: `Marca`, `Criador`, `Campanha`, `Candidatura`, `Convite`, `Agenda`, `Briefing`, `Financeiro`, `Notificacao`, `Categoria`). Atualizar `getDefaultRolePermissions` e o seed de roles.

### 5.2 Onboarding e aprovação (máquina de estado)

- Campos novos em `User` (ou tabela `UserOnboarding`): `onboardingStatus`, `onboardingStep`, `approvedAt`, `approvedBy`, `reprovalReason`.
- Regra: `userType = USER` no signup; primeira tela do onboarding define `MARCA` ou `CRIADOR`.
- `AuthGuard` global já protege; adicionar guard/regra que **bloqueia ações de negócio enquanto `onboardingStatus != APROVADO`** (perfil incompleto não publica campanha nem se candidata — RF e regra do PRD).

### 5.3 Storage (`StorageService`)

- Interface de abstração: `getUploadUrl(key, contentType)`, `getReadUrl(key)`, `remove(key)`.
- Implementação S3-compatível com presigned URL. Upload direto client→bucket; backend só assina e registra a `key`.

### 5.4 Notificações (base)

- Modelo `Notificacao` (in-app): `userId`, `type`, `title`, `body`, `link`, `readAt`.
- `NotificationService` com dois canais: persiste in-app + dispara email via Resend (templates por evento).
- Eventos cobertos ao longo das fases: perfil aprovado/reprovado, nova candidatura, convite recebido, campanha fechada, live agendada, pagamento atualizado.

### 5.5 Admin — fila de aprovação

- Endpoint + tela admin listando perfis `PENDENTE`/`EM_ANALISE` em `<DataTable>`.
- Ações: aprovar, reprovar (com motivo), solicitar ajustes → dispara notificação.

---

## 6. Fase 1 — MVP Concierge (ordenado pelo fluxo do usuário)

> Meta: operar **uma campanha real de ponta a ponta** com fricção mínima.

### Etapa 1 — Onboarding Marca

- **Fluxo:** signup → escolhe "Sou Marca" → formulário curto (nome da empresa, categoria/segmento, site ou @TikTok) → status `EM_ANALISE` → tela "em análise" → ao aprovar, libera dashboard.
- **Dados:** `MarcaProfile` (userId, nomeEmpresa, segmento, site, tiktokHandle, logoKey?).
- **Permissões:** `marca.update` (próprio), `marca.read`.
- **Backend:** `POST/PATCH /marca/me`, `GET /marca/me`.
- **Frontend:** `/dashboard` onboarding wizard (máx. 3 campos), tela de "perfil em análise".

### Etapa 2 — Onboarding Criador

- **Fluxo:** signup → escolhe "Sou Criador" → formulário curto (nome, cidade, nichos, capacidades = host/afiliado, disponibilidade básica) → adiciona links de portfólio + upload de mídia (S3) → `EM_ANALISE` → aprovação.
- **Dados:** `CriadorProfile` (userId, bio, cidade, nichos[], capacidades[], disponibilidade, faixaCache?, portfolioLinks[], midiaKeys[]).
- **Permissões:** `criador.update` (próprio), `criador.read`.
- **Backend:** `POST/PATCH /criador/me`, `GET /criador/me`, `POST /criador/me/midia/upload-url`.
- **Frontend:** wizard curto + uploader (presigned URL).

### Etapa 3 — Campanhas (2 campos para iniciar)

- **Fluxo:** marca aprovada clica "Nova campanha" → preenche **nome + categoria** → cria `RASCUNHO` → completa detalhes depois (objetivo, formato, data, cachê, comissão, cidade, briefing inicial, assets) → "Publicar" muda para `ABERTA`.
- **Dados:** `Campanha` (marcaId, nome, categoriaId, status, objetivo?, formato?, dataDesejada?, cacheFixo?, comissao?, cidade?, briefingInicial?), `CampanhaAsset` (campanhaId, key, tipo).
- **Permissões:** `campanha.create/read/update/publish/cancel`.
- **Backend:** CRUD `/campanhas` + `POST /campanhas/:id/publicar`, `POST /campanhas/:id/cancelar`. Auditar mudanças de status.
- **Frontend:** `<DataTable>` de campanhas (sort/filtros/export), tela de detalhe, formulário incremental.

### Etapa 4 — Lista de criadores com filtros (sem score)

- **Fluxo:** dentro da campanha, marca abre "Buscar criadores" → `<DataTable>` de criadores aprovados com filtros (nicho, cidade, capacidade, faixa de cachê, disponibilidade). Sem score.
- **Permissões:** `criador.read`.
- **Backend:** `GET /criadores?filtros`.
- **Frontend:** `<DataTable>` com `filters` (DataTableFilter[]) + ação "Convidar".

### Etapa 5 — Candidatura + Convite

- **Fluxo:**
  - Criador vê campanhas `ABERTA` compatíveis → "Candidatar-se" (`Candidatura` PENDENTE).
  - Marca convida criador direto (`Convite` ENVIADO).
  - Aceite mútuo: ao aceitar, gera vínculo. Recusa/cancelamento registram motivo.
- **Dados:** `Candidatura` (campanhaId, criadorId, status, motivo?), `Convite` (campanhaId, criadorId, status, motivo?).
- **Permissões:** `candidatura.create/read/update`, `convite.create/read/update`.
- **Backend:** `/campanhas/:id/candidaturas`, `/campanhas/:id/convites`, ações de aceitar/recusar/cancelar. Notificação em cada evento.
- **Frontend:** "Minhas candidaturas" (criador), "Candidaturas/convites" (marca, na campanha).

### Etapa 6 — Fechamento da campanha + Agenda mínima

- **Fluxo:** após aceite mútuo, marca "Fecha" a campanha (`FECHADA`) e define **data/hora da live** → cria `LiveEvento` → aparece na lista "Próximas lives" de marca e criador. Sem calendário visual nem detecção de conflito no MVP.
- **Dados:** `LiveEvento` (campanhaId, criadorId, dataHora, status confirmação).
- **Permissões:** `campanha.update`, `agenda.read/update`.
- **Backend:** `POST /campanhas/:id/fechar`, `GET /agenda` (por usuário). Auditar.
- **Frontend:** lista simples "Próximas lives" no dashboard.

### Etapa 7 — Briefing + Checklist simples

- **Fluxo:** na campanha fechada, marca preenche briefing (texto + assets já anexados) e um checklist pré-live com itens básicos (setup, oferta, cupom, produto). Criador marca itens como feitos.
- **Dados:** `Briefing` (campanhaId, conteudo), `ChecklistItem` (campanhaId, label, done, responsavel?).
- **Permissões:** `briefing.read/update`.
- **Backend:** `/campanhas/:id/briefing`, `/campanhas/:id/checklist`.
- **Frontend:** aba "Briefing" no detalhe da campanha.

### Etapa 8 — Financeiro como registro

- **Fluxo:** ao concluir a live (marca/admin marca `CONCLUIDA`), registra-se `RegistroFinanceiro` com cachê fixo, comissão e fee da plataforma separados + status. Sem cálculo automático nem gateway. Status muda manualmente: `PENDENTE → APROVADO → PAGO` (ou `EM_CONTESTACAO`).
- **Dados:** `RegistroFinanceiro` (campanhaId, criadorId, cacheFixo, comissao, feePlataforma, status, comprovanteKey?).
- **Permissões:** `financeiro.read/update`.
- **Backend:** `/campanhas/:id/financeiro`. Auditar mudança de status.
- **Frontend:** `<DataTable>` "Ganhos/Repasses" (criador) e "Pagamentos" (marca/admin).

### Etapa 9 — Dashboards por perfil (simples)

- **Marca:** campanhas ativas, próximas lives, candidaturas pendentes, gasto previsto.
- **Criador:** campanhas disponíveis, minhas candidaturas, próximas lives, repasses.
- **Admin:** fila de aprovação, campanhas abertas, lives do dia, pagamentos pendentes.
- Cada um é **uma tela só**, resumo direto. Sem widgets supérfluos.

### Etapa 10 — Admin Fase 1

- Aprovação de marcas e criadores (fila da Fase 0).
- Gestão de campanhas (visão global, intervenção).
- Gestão de **categorias/tags/filtros** (`categoria.manage`).

---

## 7. Fase 2 — Plataforma operacional

Quando o MVP estiver validando campanhas reais, reduzir o esforço manual.

- **Onboarding Operador/Estúdio** + operação assistida (playbooks de campanha).
- **Matching por score de aderência** (nicho × campanha, disponibilidade, histórico, faixa de cachê).
- **Avaliação bilateral + reputação/ranking**; perfis com alto no-show perdem visibilidade.
- **Chat contextual** por campanha (mensagens marca↔criador↔operador).
- **Checklist avançado + ocorrências operacionais** (registro de incidentes pré/durante live).
- **Centro de notificações in-app completo** (preferências, histórico).
- **Status de campanha expandido** (`EM_SELECAO`, `EM_PREPARACAO`, `AO_VIVO`) + reaceite em mudança crítica de data/produto/remuneração.
- **Agenda completa**: calendário visual + detecção de conflito de horário (impede dupla alocação).
- **Relatórios consolidados** + métricas por campanha/host/marca.

---

## 8. Fase 3 — Escala

- **Matching inteligente** com histórico de conversão.
- **Marketplace self-service gradual** com curadoria configurável por política de risco.
- **Rede de estúdios/operadores parceiros** (demanda regional, especialização por categoria).
- **Integração TikTok Shop API**: GMV e métricas reais, atribuição multicanal, dados de performance.
- **Internacionalização** (RNF07) e observabilidade avançada.

---

## 9. KPIs de validação do MVP (PRD)

- Tempo entre publicação da campanha e primeiro match qualificado.
- Taxa de preenchimento de vagas.
- Taxa de comparecimento em lives agendadas.
- Campanhas concluídas por mês.
- Taxa de recompra de marcas.
- % de criadores com ≥ 2 campanhas concluídas.

---

## 10. Ordem de execução recomendada

1. **Fase 0** completa (permissões, onboarding/aprovação, storage, notificações, fila admin).
2. **Fase 1** nas etapas 1→10 em sequência (cada etapa é fechável e demonstrável).
3. Validar com campanhas reais (KPIs da seção 9) antes de abrir a **Fase 2**.
4. **Fase 3** só após liquidez dos dois lados do marketplace.

Cada etapa da Fase 1 vira um plano de implementação próprio (ciclo spec → plano → implementação), seguindo: Prisma → authz → backend (guards) → frontend (PermissionGate/DataTable) → auditoria/notificação.
