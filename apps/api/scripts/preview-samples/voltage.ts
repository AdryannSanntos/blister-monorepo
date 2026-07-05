import type { SampleSet } from './types';

const voltage: SampleSet = {
  slides: [
    {
      key: 'start-v1',
      type: 'start',
      variationId: 'v1',
      image: 'cover.jpg',
      content: {
        title: 'PARE AGORA DE USAR O ==GOOGLE== DO JEITO ERRADO',
        subtitle: 'Você e eu usamos essa ferramenta de maneira errada — e eu posso te provar.',
      },
    },
    {
      key: 'duo-top',
      type: 'text-image',
      variationId: 'duo-top',
      image: 'tech.jpg',
      image2: 'dash.jpg',
      content: {
        title: 'DOIS SISTEMAS. ==UM RESULTADO.==',
        body: 'Combine dados e interface em uma operação que escala sem fricção.',
      },
    },
    {
      key: 'single',
      type: 'text-image',
      variationId: 'single',
      image: 'device.jpg',
      content: {
        title: 'ISSO MUDA ==TUDO==',
        body: 'Uma tela. Todas as métricas. Zero planilha.',
      },
    },
    {
      key: 'single-bottom',
      type: 'text-image',
      variationId: 'single-bottom',
      image: 'dash.jpg',
      content: {
        title: 'DASHBOARD ==INTELIGENTE==',
        body: 'KPIs atualizados em tempo real, sem configuração manual.',
      },
    },
    {
      key: 'statement',
      type: 'text',
      variationId: 'statement',
      content: {
        title: 'MENOS ==RUÍDO==. MAIS RESULTADO.',
        body: 'O mercado não premia quem grita mais alto — premia quem entrega mais rápido.',
      },
    },
    {
      key: 'stat',
      type: 'text',
      variationId: 'stat',
      content: {
        title: '==340%==',
        body: 'de aumento médio em conversão após 90 dias de uso.',
      },
    },
    {
      key: 'quote',
      type: 'text',
      variationId: 'quote',
      content: {
        body: 'QUEM NÃO MEDE, NÃO ==ESCALA==.',
        subtitle: 'Regra #1 de growth',
      },
    },
    {
      key: 'list',
      type: 'text',
      variationId: 'list',
      content: {
        subtitle: 'Framework',
        title: '==3 PASSOS== PARA DOMINAR',
        listItems: [
          'Elimine o que não gera resultado',
          'Automatize o que se repete',
          'Meça e ajuste semanalmente',
        ],
      },
    },
    {
      key: 'cta',
      type: 'text',
      variationId: 'cta',
      content: {
        title: 'COMECE ==AGORA==',
        body: 'Teste grátis por 14 dias. Sem cartão. Sem compromisso.',
      },
    },
    {
      key: 'image-full',
      type: 'image',
      variationId: 'full',
      image: 'team.jpg',
      content: {
        subtitle: 'Mais de 2 mil times escalando',
      },
    },
  ],
};

export default voltage;
