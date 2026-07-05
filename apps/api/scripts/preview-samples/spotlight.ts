import type { SampleSet } from './types';

const spotlight: SampleSet = {
  brand: {
    brandName: 'Nuvem SaaS',
    instagramHandle: '@nuvemsaas',
    accentColor: '#563BE7',
    metaRightMode: 'handle',
  },
  slides: [
    /* 1 — start/v1: full-bleed cover */
    {
      key: 'start-v1',
      type: 'start',
      variationId: 'v1',
      image: 'cover.jpg',
      content: {
        title: 'POR QUE O ==SAAS TRADICIONAL==\nVAI ==SUMIR==\nATÉ 2027',
      },
    },

    /* 2 — text-image/card-top: cream card, photo on top */
    {
      key: 'card-top',
      type: 'text-image',
      variationId: 'card-top',
      image: 'tech.jpg',
      content: {
        subtitle: 'Migração',
        title: 'Migre sua base em ==30 dias== sem downtime',
        body: 'Nossa plataforma de migração automatiza 97% do processo. Você mantém o faturamento ativo enquanto a transição acontece em background.',
      },
    },

    /* 3 — text-image/card-bottom: cream card, photo at bottom */
    {
      key: 'card-bottom',
      type: 'text-image',
      variationId: 'card-bottom',
      image: 'dash.jpg',
      content: {
        subtitle: 'Dashboard',
        title: 'Tudo que seu time precisa em ==uma tela só==',
        body: 'Métricas em tempo real, alertas inteligentes e relatórios que se atualizam sozinhos. Sem planilha, sem confusão.',
      },
    },

    /* 4 — text-image/card-list: cream card, photo top + check-list */
    {
      key: 'card-list',
      type: 'text-image',
      variationId: 'card-list',
      image: 'device.jpg',
      content: {
        subtitle: 'Checklist',
        title: 'Antes de ==escalar==, verifique isso',
        listItems: [
          'Monitoramento de uptime configurado',
          'Alertas de churn com acionamento automático',
          'Integração com Slack e Discord ativa',
          'Pipeline de deploy com rollback rápido',
        ],
      },
    },

    /* 5 — text/pull-quote */
    {
      key: 'pull-quote',
      type: 'text',
      variationId: 'pull-quote',
      content: {
        body: 'O melhor SaaS é aquele que o cliente esquece que está pagando — porque simplesmente funciona.',
        subtitle: 'Lucas Andrade, CTO da ContaAzul',
      },
    },

    /* 6 — text/stat */
    {
      key: 'stat',
      type: 'text',
      variationId: 'stat',
      content: {
        body: '==97%==',
        subtitle:
          'Das empresas que adotam automação recorrente reduzem o churn pela metade no primeiro trimestre.',
      },
    },

    /* 7 — text/question */
    {
      key: 'question',
      type: 'text',
      variationId: 'question',
      content: {
        title: 'Quanto custa ==não automatizar== seu SaaS hoje?',
        body: 'Cada mês sem automação de retenção representa 12% a mais de perda de MRR acumulado.',
      },
    },

    /* 8 — text/statement */
    {
      key: 'statement',
      type: 'text',
      variationId: 'statement',
      content: {
        body: 'Quem ==não mede== não melhora. Quem ==não automatiza== não escala.',
        subtitle: 'Regra nº 1 de crescimento recorrente',
      },
    },

    /* 9 — text/cta */
    {
      key: 'cta',
      type: 'text',
      variationId: 'cta',
      content: {
        subtitle: 'Comece grátis',
        title: 'Pronto para ==automatizar== seu crescimento?',
        body: 'Teste 14 dias sem cartão de crédito. Migre quando quiser.',
        callToAction: 'Começar agora →',
      },
    },

    /* 10 — image/full */
    {
      key: 'image-full',
      type: 'image',
      variationId: 'full',
      image: 'team.jpg',
      content: {
        body: 'Mais de ==2 mil times== já escalaram com a Nuvem SaaS',
      },
    },
  ],
};

export default spotlight;
