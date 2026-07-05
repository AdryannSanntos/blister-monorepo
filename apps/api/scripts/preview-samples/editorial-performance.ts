import type { SampleSet } from './types';

const editorialPerformance: SampleSet = {
  brand: {
    accentColor: '#FF4A0A',
  },
  slides: [
    {
      key: 'start-v1',
      type: 'start',
      variationId: 'v1',
      image: 'cover.jpg',
      content: {
        title: 'TREINO ==INTELIGENTE==\nNÃO É TREINO LONGO',
        subtitle: 'Performance · Semana 12',
      },
    },
    {
      key: 'text-v1',
      type: 'text',
      variationId: 'v1',
      content: {
        title: '==80/20== do seu shape',
        body: 'Consistência + sono + proteína. O resto é detalhe de feed.',
      },
    },
    {
      key: 'text-v2',
      type: 'text',
      variationId: 'v2',
      content: {
        title: 'Rotina ==mínima==',
        listItems: [
          'Aquecimento 8 min — mobilidade real',
          'Bloco principal 25 min — sem celular',
          'Fechamento 5 min — alongamento + respiração',
        ],
      },
    },
    {
      key: 'text-v3',
      type: 'text',
      variationId: 'v3',
      content: {
        body: 'Disciplina não é motivação. É ==sistema== que você segue cansado.',
        subtitle: 'Nota de treino',
      },
    },
    {
      key: 'ti-v1',
      type: 'text-image',
      variationId: 'v1',
      image: 'team.jpg',
      content: {
        title: 'Antes do ==primeiro== rep',
        body: 'Postura, respiração, foco. Sem isso, volume é ruído.',
      },
    },
    {
      key: 'ti-v2',
      type: 'text-image',
      variationId: 'v2',
      image: 'device.jpg',
      content: {
        title: 'Tracking ==simples==',
        body: 'Peso, sono, energia. Três números. Sem planilha infinita.',
      },
    },
    {
      key: 'ti-v3',
      type: 'text-image',
      variationId: 'v3',
      image: 'tech.jpg',
      image2: 'dash.jpg',
      image3: 'cover.jpg',
      content: {
        title: '==3== sinais de progresso',
        body: 'Força sobe, recuperação melhora, roupa serve diferente.',
      },
    },
    {
      key: 'ti-v4',
      type: 'text-image',
      variationId: 'v4',
      image: 'cover.jpg',
      content: {
        title: 'Erro que ==trava==',
        body: 'Trocar de programa toda semana. Escolhe um e executa 8 semanas.',
      },
    },
    {
      key: 'ti-v5',
      type: 'text-image',
      variationId: 'v5',
      image: 'team.jpg',
      content: {
        title: 'Semana ==pronta==',
        body: 'Salva o post. Reaplica na segunda.',
        callToAction: 'Plano na bio',
      },
    },
    {
      key: 'image-v1',
      type: 'image',
      variationId: 'v1',
      image: 'cover.jpg',
      content: {
        subtitle: 'Treino 06:12 — luz natural',
      },
    },
    {
      key: 'image-v2',
      type: 'image',
      variationId: 'v2',
      image: 'device.jpg',
      content: {
        subtitle: 'Recovery day — mobilidade',
      },
    },
  ],
};

export default editorialPerformance;
