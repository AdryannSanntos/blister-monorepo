# Sprint 5 — Smoke Test Manual

Este runbook valida que a fundação do sistema está funcionando antes de entregar features novas.

## Pré-requisitos

1. **Variáveis de ambiente** no `.env`:
   ```bash
   DATABASE_URL=postgresql://...
   OPENROUTER_API_KEY=sk-or-...
   GEMINI_API_KEY=AIza...              # opcional, mas necessário para testes Gemini
   TRIGGER_SECRET_KEY=tr_dev_...
   TRIGGER_PROJECT_ID=proj_...
   APP_URL=http://localhost:3001
   ```

2. **Serviços rodando**:
   ```bash
   # Terminal 1: API NestJS
   pnpm --filter @company-os/api dev

   # Terminal 2: Trigger.dev (opcional para smoke manual)
   pnpm --filter @company-os/api trigger:dev

   # Terminal 3: Frontend
   pnpm --filter @company-os/web dev
   ```

3. **Banco migrado e seeded**:
   ```bash
   pnpm --filter @company-os/api prisma migrate deploy
   pnpm --filter @company-os/api db:seed
   ```

---

## Cenários de Smoke Test

### 1. Brand → RAG Indexing

**Objetivo:** Validar que atualizar o Cérebro da Marca dispara indexação RAG.

```bash
# Login como usuário demo (negocio@blister.com.br / Negocio@123456)
# ou via API:
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"negocio@blister.com.br","password":"Negocio@123456"}' \
  -c cookies.txt

# Atualizar brand voice
curl -X PATCH http://localhost:3000/api/company/brand \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"brandVoice":"Tom acolhedor e caseiro, como uma conversa de vizinha"}'
```

**Critérios de sucesso:**
- [ ] Resposta 200 com brand atualizado
- [ ] Log no terminal da API: `Triggering Brand Brain indexing for company...`
- [ ] No banco: `RagDocument` com `sourceType=BRAND_BRAIN` e `status=INDEXED` (após alguns segundos)
- [ ] No banco: `RagChunk.count > 0` para o documento

**Query de verificação:**
```sql
SELECT rd.id, rd."sourceType", rd.status, rd.title,
       COUNT(rc.id) as chunks
FROM "RagDocument" rd
LEFT JOIN "RagChunk" rc ON rc."documentId" = rd.id
WHERE rd."sourceType" = 'BRAND_BRAIN'
GROUP BY rd.id;
```

---

### 2. Agent Run (Copywriter)

**Objetivo:** Validar que uma run de agente completa com sucesso e debita créditos.

```bash
# Buscar saldo antes
curl -s http://localhost:3000/api/credits -b cookies.txt | jq '.balance'

# Executar run do copywriter
curl -X POST http://localhost:3000/api/agents/copywriter/run \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"userInput":"Criar post sobre lançamento do novo bolo de cenoura"}'

# Aguardar e verificar status
curl -s http://localhost:3000/api/agents/runs/{runId} -b cookies.txt | jq '.status'

# Verificar saldo depois
curl -s http://localhost:3000/api/credits -b cookies.txt | jq '.balance'
```

**Critérios de sucesso:**
- [ ] Run criada com `status=QUEUED`, depois `RUNNING`, depois `COMPLETED`
- [ ] `outputPayload` contém `caption`, `hashtags[]`, `tone`, `reviewStatus: PENDING`
- [ ] `AgentRunStep` criados (3 steps: retrieve_context, generate_content, validate_output)
- [ ] `CreditBalance.amount` diminuiu
- [ ] `CreditLedger` tem entradas DEBIT com `agentRunId` e `agentRunStepId`

**Query de verificação:**
```sql
SELECT ar.id, ar.status, ar."creditCost",
       ars."stepKey", ars.status as step_status, ars."creditCost" as step_cost
FROM "AgentRun" ar
LEFT JOIN "AgentRunStep" ars ON ars."agentRunId" = ar.id
ORDER BY ar."createdAt" DESC, ars."stepIndex"
LIMIT 10;
```

---

### 3. Review → Agent Learning

**Objetivo:** Validar que aprovar uma run dispara indexação de learning.

```bash
# Aprovar a run
curl -X POST http://localhost:3000/api/agents/runs/{runId}/approve \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{}'
```

**Critérios de sucesso:**
- [ ] Resposta 200
- [ ] `AgentRun.reviewStatus = APPROVED`
- [ ] Log: `Triggering document indexing: AGENT_LEARNING/...`
- [ ] No banco: `RagDocument` com `sourceType=AGENT_LEARNING`, `sourceId={runId}`, `status=INDEXED`
- [ ] Chunks contêm `Aprovado` e o output serializado

**Query de verificação:**
```sql
SELECT rd.id, rd."sourceType", rd."sourceId", rd.status,
       rc.content
FROM "RagDocument" rd
JOIN "RagChunk" rc ON rc."documentId" = rd.id
WHERE rd."sourceType" = 'AGENT_LEARNING'
ORDER BY rd."createdAt" DESC
LIMIT 5;
```

---

### 4. Retrieval com Learning

**Objetivo:** Validar que uma nova run recupera contexto do learning anterior.

```bash
# Executar segunda run com query similar
curl -X POST http://localhost:3000/api/agents/copywriter/run \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"userInput":"Post sobre bolo de cenoura com chocolate"}'

# Verificar contexto (via debug/internal ou logs)
```

**Critérios de sucesso:**
- [ ] Run completa com sucesso
- [ ] Context pack inclui chunk de `AGENT_LEARNING` da run anterior
- [ ] Output considera o aprendizado (tom similar, estilo consistente)

---

### 5. SSE Events (UI)

**Objetivo:** Validar que o frontend recebe eventos em tempo real.

1. Abrir `/dashboard/agents/copywriter` no navegador
2. Abrir DevTools → Network → Filter: EventStream
3. Submeter um prompt
4. Observar eventos SSE: `run_started`, `step_started`, `step_completed`, `run_completed`

**Critérios de sucesso:**
- [ ] Eventos aparecem no stream
- [ ] UI atualiza conforme eventos (spinner durante steps, resultado ao completar)
- [ ] Badge de créditos atualiza após `run_completed`

---

### 6. Saldo Insuficiente

**Objetivo:** Validar que runs são bloqueadas com saldo insuficiente.

```bash
# Zerar saldo (via SQL ou admin)
UPDATE "CreditBalance" SET amount = 0.001 WHERE "companyId" = '...';

# Tentar executar run
curl -X POST http://localhost:3000/api/agents/copywriter/run \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"userInput":"Post teste"}'
```

**Critérios de sucesso:**
- [ ] Resposta 422 ou 402 (saldo insuficiente)
- [ ] `AgentRun` **não** criada
- [ ] Nenhum DEBIT no ledger

---

## Checklist Final

- [ ] Brand PATCH → BRAND_BRAIN INDEXED
- [ ] Agent run → COMPLETED com output válido
- [ ] Créditos debitados corretamente
- [ ] Approve → AGENT_LEARNING INDEXED
- [ ] Segunda run recupera learning
- [ ] SSE funciona na UI
- [ ] Saldo insuficiente bloqueia run

---

## Troubleshooting

### Trigger.dev não dispara tasks

1. Verificar `TRIGGER_SECRET_KEY` e `TRIGGER_PROJECT_ID`
2. Verificar se `trigger:dev` está rodando
3. Verificar logs do Trigger.dev dashboard

### RAG não indexa

1. Verificar se `RagModule` está importado no `CompanyModule`
2. Verificar se `RAG_EVENTS_SERVICE` está provido
3. Verificar logs de erro no console

### Créditos não debitam

1. Verificar se `CreditStepInterceptor.debitStep` está sendo chamado
2. Verificar se o kernel está emitindo eventos de step
3. Verificar se `AgentRunStep.creditCost > 0`

### SSE não funciona

1. Verificar se `AgentSseService.emit*` está sendo chamado
2. Verificar CORS/cookies no frontend
3. Verificar se `run-event.publisher` está fazendo POST para o endpoint interno
