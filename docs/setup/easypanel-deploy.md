# Deploy no EasyPanel

## Contexto Atual

O monorepo agora possui:

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `docker-compose.yml` com `postgres`, `api` e `web`, sem publicar `ports` no host
- `docker-compose.local.yml` com os `ports` para desenvolvimento local

Isso permite dois caminhos de deploy no EasyPanel:

1. `App Service + Postgres Service`.
2. `Compose Service` com o `docker-compose.yml` do repositório.

Para monorepo, o fluxo mais previsível hoje e o `Compose Service`, porque ele sobe o stack completo com a mesma topologia validada localmente.

## Documentacao Consultada

Resumo da documentacao atual do EasyPanel:

- `App Service`: aceita repositório GitHub, git custom ou Docker image; variáveis de ambiente ficam disponíveis em build-time e run-time; domínio exige configuração do proxy port.
- `Postgres Service`: usa a imagem oficial `postgres`; dados persistem no caminho interno do projeto; acesso remoto exige porta pública.
- `Builders`: se existir `Dockerfile`, o EasyPanel usa ele; sem `Dockerfile`, tenta buildpacks.
- `Compose Service`: a documentação pública ainda está marcada como "Documentation Coming Soon", mas o recurso existe no produto.

## Pré-requisitos na VPS

1. Instalar o EasyPanel em uma VPS nova.
2. Garantir portas `80` e `443` livres.
3. Conectar o GitHub em `Settings -> Github` com token apropriado.

## Fluxo Recomendado: Compose Service

### 1. Validar localmente

Na raiz do monorepo:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

O esperado e subir:

- `postgres`
- `api` na porta `3001`
- `web` na porta `3000`

### 2. Criar projeto no EasyPanel

1. Criar um novo projeto, por exemplo `company-os`.
2. Escolher `Compose Service`.
3. Conectar o repositório GitHub do monorepo.

### 3. Usar o compose do projeto

No serviço Compose, usar o `docker-compose.yml` da raiz do projeto.

Importante:

- no EasyPanel, use apenas o `docker-compose.yml`
- o `docker-compose.yml` principal não publica `ports`, evitando os avisos e conflitos do painel
- o arquivo `docker-compose.local.yml` existe só para desenvolvimento local

### 4. Definir variáveis de ambiente

No EasyPanel, configure as variáveis do stack:

```env
POSTGRES_DB=company_os
POSTGRES_USER=company_os
POSTGRES_PASSWORD=<senha-forte>
POSTGRES_PORT=5432

API_PORT=3001
WEB_PORT=3000

CORS_ORIGIN=https://app.seudominio.com
BETTER_AUTH_SECRET=<segredo-forte>
BETTER_AUTH_URL=https://api.seudominio.com
NEXT_PUBLIC_API_URL=https://api.seudominio.com

RESEND_API_KEY=<sua-chave>
RESEND_FROM_EMAIL=Company OS <noreply@seudominio.com>

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Observacao:

- `NEXT_PUBLIC_API_URL` precisa ser a URL pública da API, não o hostname interno do container.
- `BETTER_AUTH_URL` também precisa apontar para a URL pública da API.

### 5. Configurar domínios

Use domínios separados:

- `app.seudominio.com` -> serviço `web`
- `api.seudominio.com` -> serviço `api`

No EasyPanel, configure o proxy de cada serviço apontando para:

- `web`: porta `3000`
- `api`: porta `3001`

### 6. Primeiro deploy

Depois de configurar env e domínios, faça o deploy.

O serviço `api` já roda:

```bash
pnpm --filter @company-os/api exec prisma db push && node -r tsconfig-paths/register -r ts-node/register apps/api/src/main.ts
```

Ou seja, no primeiro boot ele:

1. gera o schema aplicado no banco
2. sobe a API

## Alternativa: App Service + Postgres Service

Se preferir mais controle operacional:

1. criar um `Postgres Service` nativo no EasyPanel
2. criar um `App Service` para `api` usando `apps/api/Dockerfile`
3. criar um `App Service` para `web` usando `apps/web/Dockerfile`

Esse fluxo também funciona bem, mas exige configurar e acompanhar 3 serviços em vez de um stack Compose.

## Checklist Final

1. `docker compose -f docker-compose.yml -f docker-compose.local.yml up --build` funciona localmente.
2. GitHub conectado ao EasyPanel.
3. Projeto criado no painel.
4. Compose Service ou App Services configurados.
5. `BETTER_AUTH_URL` e `NEXT_PUBLIC_API_URL` apontando para domínios públicos corretos.
6. `CORS_ORIGIN` apontando para o domínio do frontend.
7. `RESEND_API_KEY` configurada.
8. Deploy concluído.
9. Testar `GET /api/health`.
10. Testar signup e verificação de email em produção.
