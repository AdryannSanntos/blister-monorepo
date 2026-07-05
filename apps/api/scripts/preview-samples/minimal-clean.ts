import type { SampleSet } from './types';

const minimalClean: SampleSet = {
  slides: [
    {
      key: 'start-v1',
      type: 'start',
      variationId: 'v1',
      content: {
        title: 'MENOS.\nMELHOR.',
      },
    },
    {
      key: 'text-v1',
      type: 'text',
      variationId: 'v1',
      content: {
        title: 'Uma ideia.\nUm slide.',
        body: 'Se precisa de parágrafo, divide.',
      },
    },
    {
      key: 'text-v2',
      type: 'text',
      variationId: 'v2',
      content: {
        title: '==03==',
        body: 'posts por semana bastam quando cada um tem gancho forte.',
      },
    },
    {
      key: 'text-v3',
      type: 'text',
      variationId: 'v3',
      content: {
        body: 'Silêncio visual ==vende== mais que decoração.',
      },
    },
    {
      key: 'ti-v1',
      type: 'text-image',
      variationId: 'v1',
      image: 'cover.jpg',
      content: {
        title: 'Foto ==crua==',
        body: 'Sem filtro SaaS. Só luz e assunto.',
      },
    },
    {
      key: 'ti-v2',
      type: 'text-image',
      variationId: 'v2',
      image: 'tech.jpg',
      content: {
        title: 'Tipografia ==grande==',
        body: 'Legível no scroll rápido.',
      },
    },
    {
      key: 'ti-v3',
      type: 'text-image',
      variationId: 'v3',
      image: 'team.jpg',
      image2: 'device.jpg',
      content: {
        title: 'Duas imagens,\num ponto',
        body: 'Antes / depois sem texto demais.',
      },
    },
    {
      key: 'image-v1',
      type: 'image',
      variationId: 'v1',
      image: 'dash.jpg',
      content: {
        subtitle: 'Frame 08',
      },
    },
    {
      key: 'image-v2',
      type: 'image',
      variationId: 'v2',
      image: 'cover.jpg',
      content: {
        subtitle: 'Frame 09',
      },
    },
  ],
};

export default minimalClean;
