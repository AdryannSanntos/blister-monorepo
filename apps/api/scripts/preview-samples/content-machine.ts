import type { SampleSet } from './types';

const contentMachine: SampleSet = {
  slides: [
    {
      key: 'start-v1',
      type: 'start',
      variationId: 'v1',
      image: 'cover.jpg',
      content: {
        title: 'COMO CRIAR ==CONTEÚDO== QUE VENDE',
        subtitle: 'Sem postar todo dia',
      },
    },
    {
      key: 'text-v1',
      type: 'text',
      variationId: 'v1',
      content: {
        title: 'O erro que ==mata== seu alcance',
        body: 'Postar sem narrativa é gritar no vazio. Carrossel é história em camadas.',
      },
    },
    {
      key: 'text-v2',
      type: 'text',
      variationId: 'v2',
      content: {
        title: '==3== regras que ninguém te conta',
        listItems: [
          'Slide 1 promete, não entrega tudo',
          'Um insight por slide — sem textão',
          'Fechamento com ação clara, não genérica',
        ],
      },
    },
    {
      key: 'text-v3',
      type: 'text',
      variationId: 'v3',
      content: {
        body: 'Quem domina o formato ==carrossel== domina o feed em 2025.',
        subtitle: 'Dado interno, 200+ contas',
      },
    },
    {
      key: 'text-v4',
      type: 'text',
      variationId: 'v4',
      content: {
        title: 'Salva este post',
        body: 'Volta quando for montar seu próximo carrossel.',
        callToAction: 'Segue para mais frameworks',
      },
    },
    {
      key: 'ti-start-dark',
      type: 'text-image',
      variationId: 'start-dark',
      image: 'tech.jpg',
      content: {
        title: 'Antes: ==50 posts== por mês',
        body: 'Depois: 4 carrosséis que performam melhor que tudo.',
      },
    },
    {
      key: 'ti-start-white',
      type: 'text-image',
      variationId: 'start-white',
      image: 'team.jpg',
      content: {
        title: 'Equipe enxuta, ==resultado== grande',
        body: 'Menos reunião, mais publicação com intenção.',
      },
    },
    {
      key: 'ti-start-accent',
      type: 'text-image',
      variationId: 'start-accent',
      image: 'device.jpg',
      content: {
        title: 'Seu celular ==já é== estúdio',
        body: 'Foto + copy certa vence produção cara sem alma.',
      },
    },
    {
      key: 'ti-center-dark',
      type: 'text-image',
      variationId: 'center-dark',
      image: 'dash.jpg',
      content: {
        title: 'Métrica que ==importa==',
        body: 'Salvamentos > curtidas. Sempre.',
      },
    },
    {
      key: 'ti-center-white',
      type: 'text-image',
      variationId: 'center-white',
      image: 'cover.jpg',
      content: {
        title: 'Roteiro em ==5 minutos==',
        body: 'Gancho, tensão, prova, CTA. Repete até virar hábito.',
      },
    },
    {
      key: 'ti-center-accent',
      type: 'text-image',
      variationId: 'center-accent',
      image: 'tech.jpg',
      content: {
        title: 'Formato ==editorial==',
        body: 'Parece revista, não anúncio de software.',
      },
    },
    {
      key: 'ti-bottom-dark',
      type: 'text-image',
      variationId: 'bottom-dark',
      image: 'team.jpg',
      content: {
        title: 'Audiência ==quente==',
        body: 'Quem salva volta. Quem volta compra.',
      },
    },
    {
      key: 'ti-bottom-white',
      type: 'text-image',
      variationId: 'bottom-white',
      image: 'device.jpg',
      content: {
        title: 'Teste A/B ==visual==',
        body: 'Mesmo texto, capa diferente — dobra o CTR.',
      },
    },
    {
      key: 'ti-bottom-accent',
      type: 'text-image',
      variationId: 'bottom-accent',
      image: 'dash.jpg',
      content: {
        title: 'Próximo passo',
        body: 'Monta o carrossel de hoje com esse framework.',
        callToAction: 'Link na bio',
      },
    },
  ],
};

export default contentMachine;
