# Regras de Uso

## O que fazer

- usar os componentes de `core/shared/components/ui`
- consumir tokens do `globals.css`
- manter paridade dark/light
- validar se a rota `/design-system` ja cobre o padrao desejado antes de inventar uma nova solucao
- documentar componentes ou variacoes novas nesta pasta
- o container raiz de `Card` nao deve carregar padding estrutural; o respiro pertence a `CardHeader`, `CardContent` e `CardFooter`
- manter sidebars de dashboard com altura exata da viewport
- nao colocar busca dentro da sidebar quando ja existir busca principal no header
- centralizar a busca principal no header da dashboard em desktop
- usar `Button` no tamanho padrao `md`; em dashboards, todos os buttons devem ser `md`, salvo caso especifico e intencional
- quando um controle acionável estiver dentro de um card, como `Button`, trigger de select ou trigger de dropdown, preferir `variant="ghost"`; `outline` deve ser reservado para contextos fora de cards
- igualar a altura de controles vizinhos, como `Button` ao lado de `Button` ou `Input` ao lado de `Button`
- manter icon buttons com a mesma altura dos buttons `md`
- centralizar verticalmente headers de cards que tiverem divider
- reduzir padding superior de cards quando houver respiro desnecessario
- estruturar cards com top/header, main/content e footer/actions quando houver conteudo suficiente
- manter KPI cards simples com numero mais compactos e sem obrigar divisao header/content/footer; agrupar label + numero e deixar delta/hint/footer separado
- KPI cards tambem devem respeitar a regra estrutural do card: nenhum padding na raiz, apenas nos slots internos usados (`CardContent` e `CardFooter`, e `CardHeader` quando existir)
- usar divider entre header e conteudo em cards com conteudo composto
- quando um card tiver buttons no footer, o footer deve ter divider proprio, altura compacta, padding padronizado entre cards e nao pode somar espaco do gap estrutural do card com o padding do footer
- envolver charts em uma superficie interna mais escura que o card, com borda discreta e radius consistente
- nao usar glow em cards
- permitir warning no projeto, mas nao usar warning em texto dentro de cards; usar texto padrao, success ou error/danger
- usar titulos de cards maiores, consistentes e com peso maximo `font-medium`
- avaliar `DropdownMenu` quando houver tres ou mais buttons/actions lado a lado
- adaptar seletor de empresa e demais elementos quando a sidebar estiver fechada
- posicionar o toggle da sidebar no header da dashboard
- manter header da dashboard sticky durante scroll
- separar modais em header, content e footer
- usar `Display` para o titulo principal/saudacao da tela quando houver intencao editorial; ele pode envolver o texto completo, incluindo o nome do usuario, mas deve continuar raro
- padronizar avatares com shape `circle` ou `square`; se houver imagem, usar `AvatarImage`; sem imagem, usar iniciais em `AvatarFallback` com borda e fundo sutil, sem fundo primary solido

## O que evitar

- criar markup paralelo quando ja existir primitive equivalente
- introduzir uma nova biblioteca de UI sem decisao registrada
- usar cores raw direto em componentes quando houver token semantico
- quebrar a estrutura `core/modules` e `core/shared`
- aplicar `font-semibold` de forma ampla; usar somente em pontos criticos
- usar cores aleatorias ou gradientes em avatares
- alinhar headers de cards com divider no eixo horizontal sem necessidade; a regra e centralizacao vertical, nao horizontal

## Regra de extensao

Quando um componente precisar variar de forma relevante, a ordem recomendada e:

1. verificar se a variante cabe no componente atual
2. criar variante oficial
3. atualizar `/design-system`
4. atualizar a documentacao desta pasta
