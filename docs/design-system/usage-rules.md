# Regras de Uso — Blister OS

## Regras Gerais

- Usar tokens semânticos, não cores raw.
- Não usar `dark:` utility; light/dark são resolvidos por tokens.
- Uma tela deve ter uma ação principal clara.
- Toda ação assíncrona precisa de loading/feedback.
- Todo estado vazio precisa ser tratado.
- Empty states de listagem seguem padrão do reference (`blister-os-reference.html`).
- Processos de IA precisam ter sinal visual claro.
- Não expor ranking, confiança ou metadados internos da IA.

## Componentes

- Cards não recebem padding na raiz.
- Tabelas/listas são padrão para coleções de dados.
- Três ou mais ações lado a lado viram `DropdownMenu`.
- Dialogs precisam de header, descrição e footer.
- Badges representam status.
- Avatares sem imagem usam iniciais e fundo sutil.

## Produto

- **Contexto da marca** vive em Configurações — não módulo "Brain" separado.
- Ferramentas (Editor, Cortes, Pesquisar…) representam unidades operacionais — não expor "agente" ao usuário.
- Créditos representam consumo por workspace.
- **Arquivos** representam matéria-prima e extract para contexto.
- **Biblioteca** representa itens resgatados do Marketplace.
- Integrações representam fontes de contexto futuras.

## Visual

- Light theme é padrão; dark via tokens (`globals.css`).
- Roxo `primary-600` é acento principal (Blister OS).
- Rosa/laranja para badges premium/destaque conforme tokens.
- Glow é raro e intencional.

## Referência

Inventário de telas e componentes: [`blister-os-reference.md`](blister-os-reference.md)
