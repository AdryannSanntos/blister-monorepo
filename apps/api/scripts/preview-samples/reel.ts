import type { SampleSet } from './types';

const reel: SampleSet = {
  slides: [
    {
      key: 'start-v1',
      type: 'start',
      variationId: 'v1',
      image: 'cover.jpg',
      content: {
        title: 'IMPOSSÍVEL? ERA\nO QUE EU ==PENSAVA.==',
      },
    },
    {
      key: 'anchor-bottom',
      type: 'text-image',
      variationId: 'anchor-bottom',
      image: 'tech.jpg',
      content: {
        subtitle: 'Descoberta',
        title: 'O segredo não é trabalhar ==mais==',
        body: 'É eliminar o que não gera resultado e dobrar o que funciona.',
      },
    },
    {
      key: 'anchor-mid',
      type: 'text-image',
      variationId: 'anchor-mid',
      image: 'dash.jpg',
      content: {
        subtitle: 'Processo',
        title: 'Três passos para ==escalar== sem burnout',
        body: 'Primeiro, mapeie o que consome tempo sem retorno.',
        body2: 'Depois, automatize. Por fim, meça semanalmente.',
      },
    },
    {
      key: 'feature-bottom',
      type: 'text-image',
      variationId: 'feature-bottom',
      image: 'device.jpg',
      content: {
        title: 'Tudo em ==uma tela==',
        body: 'Dashboard unificado com métricas que importam de verdade.',
      },
    },
    {
      key: 'quote-image',
      type: 'text-image',
      variationId: 'quote-image',
      image: 'team.jpg',
      content: {
        body: 'Simplicidade é a ==sofisticação== suprema.',
        subtitle: 'Leonardo da Vinci',
      },
    },
    {
      key: 'panel-quote',
      type: 'text',
      variationId: 'panel-quote',
      image: 'cover.jpg',
      content: {
        body: 'O mercado não premia quem sabe ==mais== — premia quem executa melhor.',
        subtitle: 'Maria Silva, CEO',
      },
    },
    {
      key: 'panel-list',
      type: 'text',
      variationId: 'panel-list',
      image: 'tech.jpg',
      content: {
        title: 'Pilares da ==transformação==',
        listItems: [
          'Automação de processos repetitivos',
          'Centralização de dados em tempo real',
          'Experiência personalizada para o cliente',
        ],
      },
    },
    {
      key: 'stat',
      type: 'text',
      variationId: 'stat',
      image: 'dash.jpg',
      content: {
        title: '==97%==',
        body: 'das empresas que adotam automação relatam aumento na eficiência no primeiro ano.',
      },
    },
    {
      key: 'cta',
      type: 'text',
      variationId: 'cta',
      image: 'cover.jpg',
      content: {
        title: 'Comece ==hoje==',
        body: 'Acesse a plataforma gratuita e veja resultados na primeira semana.',
        callToAction: 'Teste grátis por 14 dias',
      },
    },
    {
      key: 'dark-close',
      type: 'text',
      variationId: 'dark-close',
      content: {
        body: 'Pronto para ==transformar== seu negócio?',
        body2: 'O próximo passo está a um clique de distância.',
        subtitle: 'Sem cartão. Sem compromisso.',
      },
    },
    {
      key: 'cinematic',
      type: 'image',
      variationId: 'cinematic',
      image: 'cover.jpg',
      content: {
        subtitle: 'São Paulo — sede corporativa',
      },
    },
  ],
};

export default reel;
