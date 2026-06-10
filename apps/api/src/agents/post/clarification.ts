import type { ClarificationField, EnrichmentField } from '@company-os/agent-sdk';

/**
 * Brief fields collected by the post agent. The names match what
 * {@link buildPostBrief} reads, so analysis-extracted or form-answered values
 * flow straight into generation. `slidesCount` only applies to carousels.
 */
export const POST_CLARIFICATION_FIELDS: ClarificationField[] = [
  {
    name: 'socialNetwork',
    kind: 'single',
    label: 'Para qual rede social é o post?',
    required: true,
    options: [
      { id: 'instagram', label: 'Instagram' },
      { id: 'facebook', label: 'Facebook' },
      { id: 'linkedin', label: 'LinkedIn' },
      { id: 'tiktok', label: 'TikTok' },
    ],
  },
  {
    name: 'postFormat',
    kind: 'single',
    label: 'Qual o formato do post?',
    required: true,
    options: [
      { id: 'single', label: 'Imagem única' },
      { id: 'carousel', label: 'Carrossel (vários slides)' },
    ],
  },
  {
    name: 'slidesCount',
    kind: 'single',
    label: 'Quantos slides terá o carrossel?',
    required: true,
    dependsOn: { field: 'postFormat', equals: 'carousel' },
    options: ['2', '3', '4', '5', '6', '7', '8'].map((value) => ({
      id: value,
      label: `${value} slides`,
    })),
  },
  {
    name: 'objective',
    kind: 'single',
    label: 'Qual o objetivo principal deste post?',
    required: true,
    options: [
      { id: 'sell', label: 'Vender ou divulgar um produto/serviço' },
      { id: 'engage', label: 'Engajar e educar a audiência' },
      { id: 'promo', label: 'Anunciar uma promoção ou oferta' },
      { id: 'awareness', label: 'Apresentar e fortalecer a marca' },
    ],
  },
];

/** Non-form signals the analysis pulls into the enriched brief. */
export const POST_ENRICHMENTS: EnrichmentField[] = [
  { name: 'tone', description: 'Tom de voz desejado' },
  { name: 'narrativeAngle', description: 'Ângulo narrativo ou tema central' },
  { name: 'audienceHint', description: 'Público-alvo mencionado' },
];
