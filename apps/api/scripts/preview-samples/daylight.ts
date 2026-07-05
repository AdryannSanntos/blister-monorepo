import type { SampleSet } from './types';

const daylight: SampleSet = {
  slides: [
    {
      key: 'start-v1',
      type: 'start',
      variationId: 'v1',
      image: 'team.jpg',
      image2: 'device.jpg',
      content: {
        title: 'O ==FUTURO DAS== MARCAS DIGITAIS',
        subtitle: 'Guia estratégico 2025',
      },
    },
    {
      key: 'text-statement',
      type: 'text',
      variationId: 'statement',
      content: {
        title: 'Menos ==ruído==, mais resultado.',
        subtitle: 'Princípio',
      },
    },
    {
      key: 'text-list',
      type: 'text',
      variationId: 'list',
      content: {
        title: 'Pilares da ==transformação== digital',
        subtitle: 'Estratégia',
        listItems: [
          'Automação de processos repetitivos',
          'Centralização de dados em tempo real',
          'Experiência personalizada para o cliente',
          'Cultura orientada a experimentação',
        ],
      },
    },
    {
      key: 'text-quote',
      type: 'text',
      variationId: 'quote',
      content: {
        body: 'Simplicidade é a ==sofisticação== suprema.',
        subtitle: 'Leonardo da Vinci',
      },
    },
    {
      key: 'text-stat',
      type: 'text',
      variationId: 'stat',
      content: {
        title: '==97%==',
        body: 'das empresas que adotam automação relatam aumento na eficiência operacional no primeiro ano.',
      },
    },
    {
      key: 'text-cta',
      type: 'text',
      variationId: 'cta',
      content: {
        title: 'Comece a ==transformar== seu negócio hoje',
        subtitle: 'Próximo passo',
        body: 'Acesse a plataforma gratuita e veja resultados na primeira semana.',
        callToAction: 'Teste grátis por 14 dias',
      },
    },
    {
      key: 'text-image-single-bottom',
      type: 'text-image',
      variationId: 'single-bottom',
      image: 'dash.jpg',
      content: {
        title: 'Dashboard ==inteligente==',
        subtitle: 'Produto',
        body: 'Todos os KPIs do seu negócio em uma tela limpa, atualizados em tempo real.',
      },
    },
    {
      key: 'text-image-grid-bottom',
      type: 'text-image',
      variationId: 'grid-bottom',
      image: 'team.jpg',
      image2: 'device.jpg',
      content: {
        title: 'Equipe + ==tecnologia==',
        subtitle: 'Nosso método',
        body: 'Combinamos talento humano com ferramentas modernas para entregar resultados consistentes.',
      },
    },
    {
      key: 'text-image-single-top',
      type: 'text-image',
      variationId: 'single-top',
      image: 'tech.jpg',
      content: {
        title: 'Infraestrutura ==escalável==',
        subtitle: 'Tecnologia',
        body: 'Arquitetura cloud-native pensada para crescer junto com o seu volume de dados.',
      },
    },
    {
      key: 'image-full',
      type: 'image',
      variationId: 'full',
      image: 'cover.jpg',
      content: {
        subtitle: 'São Paulo — sede corporativa',
      },
    },
  ],
};

export default daylight;
