export const agentRunInputFixtures = {
  copywriter: {
    basic: {
      userInput: 'Criar post sobre lançamento do novo bolo de cenoura',
    },
    detailed: {
      userInput:
        'Criar legenda para Instagram sobre o lançamento do nosso novo bolo de cenoura com cobertura de chocolate. Tom animado e convidativo.',
    },
    minimal: {
      userInput: 'Post sobre promoção',
    },
  },
  strategist: {
    basic: {
      userInput: 'Planejar conteúdo para a próxima semana',
    },
    detailed: {
      userInput:
        'Criar calendário de conteúdo para Instagram focando no lançamento de novos produtos e depoimentos de clientes',
    },
  },
  designer: {
    basic: {
      userInput: 'Criar imagem para post de lançamento de produto',
    },
    detailed: {
      userInput:
        'Criar imagem promocional para Instagram mostrando bolo de cenoura com chocolate, estilo clean e moderno',
    },
  },
};

export const agentRunOutputFixtures = {
  copywriter: {
    valid: {
      caption:
        '🎉 Novidade chegando! Nosso novo bolo de cenoura com cobertura de chocolate está pronto para adoçar seu dia. Feito com ingredientes frescos e muito carinho. Encomende já!',
      hashtags: [
        '#bolodecenoura',
        '#confeitaria',
        '#doceartesanal',
        '#novidade',
        '#encomende',
      ],
      tone: 'enthusiastic',
      reviewStatus: 'PENDING',
    },
    invalid: {
      caption: '',
      hashtags: [],
    },
  },
  strategist: {
    valid: {
      topics: [
        {
          title: 'Lançamento do produto',
          description: 'Post de divulgação do novo bolo de cenoura',
          suggestedDate: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          title: 'Depoimento de cliente',
          description: 'Compartilhar feedback positivo de cliente satisfeito',
          suggestedDate: new Date(Date.now() + 172800000).toISOString(),
        },
        {
          title: 'Bastidores',
          description: 'Mostrar processo de produção',
          suggestedDate: new Date(Date.now() + 259200000).toISOString(),
        },
      ],
      calendar: {
        weeklyPosts: 3,
        bestTimes: ['09:00', '12:00', '18:00'],
        platforms: ['instagram'],
      },
      recommendations:
        'Focus on visual content showing product quality. User testimonials increase credibility.',
      reviewStatus: 'PENDING',
    },
  },
  designer: {
    valid: {
      imageUrl: 'https://storage.example.com/generated/image-123.png',
      storageKey: 'generated/image-123.png',
      prompt:
        'Modern product showcase of chocolate-covered carrot cake, professional lighting, clean background',
      style: 'minimalist',
      reviewStatus: 'PENDING',
    },
  },
};

export type AgentId = 'copywriter' | 'strategist' | 'designer';

export function getAgentRunInput(agentId: AgentId, variant: string = 'basic') {
  const fixtures = agentRunInputFixtures[agentId];
  return fixtures?.[variant as keyof typeof fixtures] ?? fixtures?.basic;
}

export function getAgentRunOutput(agentId: AgentId, variant: string = 'valid') {
  const fixtures = agentRunOutputFixtures[agentId];
  return fixtures?.[variant as keyof typeof fixtures] ?? fixtures?.valid;
}
