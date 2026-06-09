---
name: blister-social-post-uiux
description: Skill de UI/UX para geração flexível de posts sociais em HTML + CSS, com foco em composição visual, legibilidade, branding, adaptação entre formatos e consistência criativa para Instagram, Stories, Feed, Carrossel, LinkedIn e peças semelhantes. Define regras, sistemas e guardrails sem impor um único resultado visual.
---

## Propósito

Esta skill existe para orientar a geração de peças sociais em HTML + CSS com alta qualidade visual, clareza de comunicação e consistência de marca, sem engessar o resultado final em um único template.

Ela deve funcionar como um sistema maleável de direção criativa e UI/UX visual para posts, permitindo múltiplas interpretações formais a partir de um mesmo conjunto de regras.

O objetivo não é dizer exatamente como a arte deve ficar, mas definir:

- como estruturar a composição;
- como distribuir informação;
- como manter legibilidade e impacto;
- como adaptar a peça entre canais e proporções;
- como preservar coerência visual da marca;
- como gerar HTML + CSS prontos para renderização e exportação.

## Princípio central

A skill deve orientar a geração de peças sociais como **sistemas de composição**, não como templates rígidos.

Ela não deve forçar:

- uma estética única;
- uma paleta fixa universal;
- uma estrutura idêntica para toda peça;
- uma posição fixa para todos os elementos;
- um único tipo de grid;
- uma assinatura visual repetitiva em todos os outputs.

## Guardrails profissionais (obrigatório)

- **Tipografia**: use somente a fonte da marca cadastrada no Cérebro da Marca. Nunca escolha fontes aleatórias, genéricas (Arial, Inter, Roboto, Helvetica) ou diferentes entre slides.
- **Fundo**: prefira cor sólida da paleta, textura sutil ou foto da marca com overlay controlado. **Evite gradientes decorativos** salvo quando o briefing pedir explicitamente e com função compositiva clara.
- **Cores**: use apenas a paleta da marca. Contraste texto/fundo é inegociável.
- **Composição**: cada decisão visual deve ser justificada pelo briefing — nada de enfeites sem função.

## Plataformas e formatos

- Instagram Feed Square: 1080x1080
- Instagram Feed Portrait: 1080x1350
- Instagram Story: 1080x1920
- LinkedIn Horizontal: 1200x627
- LinkedIn Square: 1080x1080
- Carrossel: sequência com sistema visual compartilhado

Cada formato exige redistribuição de hierarquia, escala, respiro e área segura. Nunca faça stretch do layout original.

## Área segura

- Evitar texto colado nas bordas
- Preservar margens internas coerentes com o formato
- Em stories, proteger topo e base
- Elementos críticos nunca dependem de recorte exato

## Hierarquia de conteúdo

Camadas possíveis: eyebrow, headline, subheadline, apoio, destaque numérico, badge, CTA, marca, rodapé, prova/data.

Regras:

- Uma mensagem dominante clara
- Apenas um ponto compete pelo maior destaque
- CTA perceptível mas subordinado ao objetivo
- Marca como protagonista ou assinatura conforme a intenção

## Sistemas de composição

Estruturas possíveis: centrada, alinhada à esquerda, split texto+imagem, blocos modulares, editorial, foco em número, quote, produto em destaque, camadas, minimalista.

Escolha com base no conteúdo e objetivo, não por repetição mecânica.

## Tipografia

- Poucos níveis tipográficos por peça
- Headline imediatamente legível
- Texto de apoio sem corpo pequeno demais
- Contraste de peso e escala para hierarquia
- Caixa alta só quando contribuir com tom e legibilidade

## Cor

- Paleta respeitando tom da campanha e identidade
- Contraste inegociável
- Gradientes/overlays só quando reforçarem a mensagem
- Não sacrificar legibilidade por estética

## Fundo e imagem

Tipos: cor sólida, textura sutil, pattern geométrico discreto, foto com overlay, recorte de produto, fundo editorial limpo.

Se não houver imagem da marca, prefira composição tipográfica com cor sólida da paleta — não invente fotos externas.

## Carrossel

- Continuidade visual entre slides
- Slide 1 captura atenção
- Intermediários aprofundam
- Final fecha com CTA ou assinatura

## Anti-patterns

Evitar:

- Texto demais em uma peça
- Headline sem contraste
- Elementos sem alinhamento
- Cores fortes aleatórias
- Gradientes decorativos sem função
- Fontes genéricas ou trocadas sem motivo
- Layout genérico repetido
- Fundo competindo com informação
- Post que parece template sem relação com o briefing

## Estrutura de saída HTML + CSS

- Canvas principal com dimensão explícita
- CSS inline organizado
- Área segura interna
- Sistema autocontido, sem JavaScript
- Ícones Lucide em SVG inline quando necessário

## Processo de geração

1. Entender briefing (objetivo, canal, formato, público, tom, ativos)
2. Escolher direção compositiva (textual, imagética, editorial, promocional, minimalista)
3. Definir sistema visual (hierarquia, paleta, fundo, tipografia, CTA)
4. Montar composição respeitando área segura
5. Adaptar ao formato sem distorcer a lógica
6. Gerar HTML + CSS limpo para exportação

## Critérios de qualidade

A saída é boa quando:

- a mensagem principal fica evidente rapidamente;
- a peça parece intencional e não genérica;
- a composição respira;
- o canal foi respeitado;
- o branding está presente na medida certa;
- o HTML + CSS são claros para evolução.

## Checklist final

- Formato correto?
- Área segura respeitada?
- Hierarquia principal clara?
- Texto legível em mobile?
- Fundo ajuda a leitura?
- Branding coerente?
- CTA no peso certo?
- Layout derivado do briefing?
- Sem gradiente/fonte/fundo aleatório?
