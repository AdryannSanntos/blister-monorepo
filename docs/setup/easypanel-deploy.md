# Deploy no EasyPanel

## Contexto

O monorepo possui:

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `docker-compose.yml` com `postgres`, `api` e `web` (sem `ports` no host)
- `docker-compose.local.yml` com `ports` para desenvolvimento local

Fluxo recomendado: **Compose Service** no EasyPanel com domínio único.

## Domínio único (recomendado)

Para `https://blister.adryansantoss.dev`:

- Apenas o serviço **`web`** recebe domínio público no EasyPanel
- A API fica **interna** na rede Docker (`http://api:3001`)
- O Next.js faz proxy de `/api/*` para a API via `NEXT_PUBLIC_INTERNAL_API_URL`
- O browser chama a API pelo mesmo domínio (`NEXT_PUBLIC_API_URL`)

## Pré-requisitos na VPS

1. EasyPanel instalado com portas `80` e `443` livres
2. Repositório conectado em `Settings -> Github`
3. DNS: registro `A` de `blister.adryansantoss.dev` apontando para o IP da VPS

## 1. Validar localmente

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Serviços esperados:

- `postgres` na porta `5432`
- `api` na porta `3001`
- `web` na porta `3000`

Testes:

```bash
curl http://localhost:3001/api/health
curl -I http://localhost:3000
```

## 2. Criar projeto no EasyPanel

1. Novo projeto (ex.: `blister`)
2. **Compose Service**
3. Conectar o repositório GitHub
4. Usar o `docker-compose.yml` da raiz (sem `docker-compose.local.yml`)

## 3. Variáveis de ambiente (produção)

Configure no EasyPanel:

```env
POSTGRES_DB=blister
POSTGRES_USER=blister
POSTGRES_PASSWORD=<senha-forte>

CORS_ORIGIN=https://blister.adryansantoss.dev
BETTER_AUTH_SECRET=<segredo-forte-com-32-caracteres-ou-mais>
BETTER_AUTH_URL=https://blister.adryansantoss.dev

NEXT_PUBLIC_API_URL=https://blister.adryansantoss.dev
NEXT_PUBLIC_INTERNAL_API_URL=http://api:3001

RESEND_API_KEY=<sua-chave>
RESEND_FROM_EMAIL=Blister <noreply@seudominio.com>

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

AWS_REGION=us-east-1
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=true

OPENROUTER_API_KEY=
OPENROUTER_HTTP_REFERER=https://blister.adryansantoss.dev

ASSEMBLYAI_API_KEY=
GEMINI_API_KEY=

TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_ID=
AGENT_EXECUTION_MODE=inline-stub
```

### Observações importantes

| Variável | Valor em produção |
|----------|-------------------|
| `NEXT_PUBLIC_API_URL` | URL pública do site (`https://blister.adryansantoss.dev`) |
| `NEXT_PUBLIC_INTERNAL_API_URL` | Host interno Docker (`http://api:3001`) — **não** alterar |
| `BETTER_AUTH_URL` | Mesma URL pública do site |
| `CORS_ORIGIN` | Mesma URL pública do site |
| `OPENROUTER_HTTP_REFERER` | Mesma URL pública do site |

`NEXT_PUBLIC_*` são embutidas no build do Next.js. Após alterá-las, faça **rebuild** do serviço `web`.

## 4. Configurar domínio

No EasyPanel, configure **apenas** o serviço `web`:

| Serviço | Domínio | Porta proxy |
|---------|---------|-------------|
| `web` | `blister.adryansantoss.dev` | `3000` |
| `api` | *(sem domínio público)* | — |
| `postgres` | *(sem domínio público)* | — |

## 5. Primeiro deploy

O container `api` executa automaticamente:

```bash
pnpm --filter @company-os/api exec prisma db push && node apps/api/dist/src/main.js
```

No primeiro boot:

1. Aplica o schema Prisma no Postgres
2. Sobe a API NestJS na porta `3001`

## 6. Checklist pós-deploy

1. `GET https://blister.adryansantoss.dev` carrega o frontend
2. `GET https://blister.adryansantoss.dev/api/health` retorna `{ "status": "ok", ... }`
3. Signup/login funcionam (cookies no mesmo domínio)
4. Email de verificação (se `RESEND_API_KEY` configurada)

## Alternativa: subdomínios separados

Se preferir API pública em subdomínio:

- `app.seudominio.com` → `web:3000`
- `api.seudominio.com` → `api:3001`
- `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
- `CORS_ORIGIN=https://app.seudominio.com`
- `BETTER_AUTH_URL=https://api.seudominio.com`

Nesse modelo, os rewrites do Next.js ainda funcionam para SSR/middleware via `NEXT_PUBLIC_INTERNAL_API_URL`.

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Build da API falha no `pnpm install` | `agent-sdk` ausente no Dockerfile | Já corrigido no repo |
| API não sobe | Caminho errado do `main.js` | Deve ser `apps/api/dist/src/main.js` |
| Loop infinito / 502 em `/api/*` | Rewrite apontando para URL pública | `NEXT_PUBLIC_INTERNAL_API_URL=http://api:3001` |
| Auth não persiste | `BETTER_AUTH_URL` ou `CORS_ORIGIN` incorretos | Ambos devem usar `https://blister.adryansantoss.dev` |
| Web inacessível no container | Bind em localhost | `HOSTNAME=0.0.0.0` no serviço `web` |
