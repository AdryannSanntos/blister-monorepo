# User Flows — Blister OS

> Alinhado a [`blister-os-reference.html`](../../blister-os-reference.html) e [`blister-os-prd.md`](../prd/blister-os-prd.md).

---

## 1. Onboarding (Plano 3)

```
Signup → Espaço Pessoal criado → wizard curto (nome workspace + voz)
  → créditos free tier → Home OS
```

Campos máx.: 2–3. Logo opcional no primeiro passo.

---

## 2. Home → Estúdio

```
Home (#/home)
  ├── Card Editor de Vídeo → #/editor → wizard (vídeo + Edit Style + gerar)
  ├── Card Gerador de Cortes → #/cortes → wizard (fonte + estilo + cortes)
  └── Card Pesquisar → #/agent/research → input briefing → run → revisão
```

Atividade recente e atalhos para Projetos/Marketplace.

---

## 3. Marketplace → Biblioteca

```
Marketplace (#/marketplace)
  → filtrar tipo (Edit Style, Template, …)
  → Detalhe (#/item/{id})
  → Resgatar (grátis ou créditos)
  → owned atualizado
  → Biblioteca (#/library) lista itens possuídos
  → Editor/Cortes consomem Edit Style da biblioteca
```

---

## 4. Arquivos → Wizards

```
Arquivos (#/uploads / #/files)
  → navegar pastas (breadcrumb)
  → upload vídeo bruto
  → (Plano 3) extract assíncrono
  → "Abrir no Editor" | "Usar em Cortes"
```

---

## 5. Projetos (workspace)

```
Projetos (#/projects)
  → lista projetos (status, peças/runs count)
  → abrir projeto (futuro: detalhe)
  → usuário escolhe ferramenta (Editor, Cortes, Planning…)
  → run isolada — sem pipeline automático
  → revisão na superfície da ferramenta
```

---

## 6. Agente marketplace

```
Sidebar Conteúdo → Planejar / Roteiro
  → #/agent/planning | #/agent/script
  → (se não possui) redirect Marketplace
  → input → run → output → Aprovar | Editar | Negar
  → feedback → RAG AGENT_LEARNING
```

---

## 7. Configurações

```
Configurações (#/settings)
  ├── Contexto da marca (ex-Brand Brain) → editar identidade
  ├── Créditos → saldo + histórico
  ├── Equipe → convites e roles (Empresa)
  └── Workspace → nome, slug
```

Copy: **"Contexto da marca"** — nunca "Cérebro da Marca".

---

## 8. Workspace switch (Plano 3)

```
Header switcher
  → Espaço Pessoal | Empresa A | Empresa B
  → troca contexto (créditos, biblioteca, arquivos, permissões)
```

---

## 9. Revisão por run

```
Run COMPLETED
  → preview output (vídeo, cortes list, roteiro texto…)
  → Aprovar → learning indexado
  → Editar → PATCH output validado
  → Negar → feedback + opcional regenerar nova run
```

Sem módulo global `/pecas`.

---

## Mapa de rotas

Ver [`docs/design-system/blister-os-reference.md`](../design-system/blister-os-reference.md).
