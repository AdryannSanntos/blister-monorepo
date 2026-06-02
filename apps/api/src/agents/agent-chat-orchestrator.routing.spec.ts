import { AgentChatOrchestratorService } from './agent-chat-orchestrator.service';

function makeService() {
  return new AgentChatOrchestratorService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

function makeServiceWithAi(generateText = jest.fn()) {
  return new AgentChatOrchestratorService(
    {} as never,
    { generateText } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe('AgentChatOrchestratorService routing hints', () => {
  it('routes greetings to a direct response', () => {
    const service = makeService();

    const hint = (service as any).inferRoutingHint('olá', [
      'rag_search',
      'file_search',
      'web_research',
    ]);

    expect(hint).toMatchObject({
      recommendedAction: 'respond',
      query: '',
    });
  });

  it('routes identity/self questions to a direct response without searching', () => {
    const service = makeService();

    for (const message of [
      'voce é um agente do que?',
      'o que você faz?',
      'qual é o seu papel?',
      'quem é você?',
    ]) {
      const hint = (service as any).inferRoutingHint(message, [
        'rag_search',
        'file_search',
        'web_research',
      ]);
      expect(hint).toMatchObject({ recommendedAction: 'respond', query: '', confident: true });
    }
  });

  it('marks the generic rag_search fallback as not confident so the model decides', () => {
    const service = makeService();

    const hint = (service as any).inferRoutingHint('me ajuda a pensar em algumas ideias?', [
      'rag_search',
    ]);

    expect(hint).toMatchObject({ recommendedAction: 'rag_search', confident: false });
  });

  it('routes curriculum and document questions to file_search', () => {
    const service = makeService();

    const hint = (service as any).inferRoutingHint('quero saber sobre o curriculo do adryan', [
      'rag_search',
      'file_search',
    ]);

    expect(hint).toMatchObject({
      recommendedAction: 'file_search',
      query: 'quero saber sobre o curriculo do adryan',
    });
    expect(hint.reason).toContain('arquivo ou documento interno');
  });

  it('routes internal company knowledge questions to rag_search', () => {
    const service = makeService();

    const hint = (service as any).inferRoutingHint('qual é o histórico do cliente acme com a empresa?', [
      'rag_search',
      'file_search',
    ]);

    expect(hint).toMatchObject({
      recommendedAction: 'rag_search',
      query: 'qual é o histórico do cliente acme com a empresa?',
    });
    expect(hint.reason).toContain('conhecimento interno da empresa');
  });

  it('routes external and recent topics to web_research', () => {
    const service = makeService();

    const hint = (service as any).inferRoutingHint('pesquise noticias recentes sobre o mercado de freelancers', [
      'rag_search',
      'web_research',
    ]);

    expect(hint).toMatchObject({
      recommendedAction: 'web_research',
      query: 'pesquise noticias recentes sobre o mercado de freelancers',
    });
    expect(hint.reason).toContain('fontes publicas');
  });

  it('falls back to rag_search when file_search is disabled', () => {
    const service = makeService();

    const hint = (service as any).inferRoutingHint('procure o contrato da acme', ['rag_search']);

    expect(hint).toMatchObject({
      recommendedAction: 'rag_search',
      query: 'procure o contrato da acme',
    });
  });

  it('falls back to respond when no internal tools are enabled', () => {
    const service = makeService();

    const hint = (service as any).inferRoutingHint('me diga sobre o currículo do adryan', []);

    expect(hint).toMatchObject({
      recommendedAction: 'respond',
      query: '',
    });
  });
});

describe('AgentChatOrchestratorService tool loop prompt', () => {
  it('embeds the suggested action, decisionReason requirement, and tool guidance', () => {
    const service = makeService();

    const prompt = (service as any).buildToolLoopSystemPrompt({
      agentName: 'Agente Pesquisa',
      userMessage: 'quero saber sobre o curriculo do adryan',
      flowConfig: {
        name: 'Fluxo',
        objective: 'Responder perguntas',
        instructions: 'Use o contexto disponível.',
        fallbackMessage: '',
      },
      agentInstructions: null,
      agentNotes: null,
      contextPrompt: '',
      canExecuteWorkflow: false,
      workflowObjective: 'Responder perguntas',
      allowedTools: ['rag_search', 'file_search', 'web_research'],
      toolContextFrames: [],
    });

    expect(prompt).toContain('Acao sugerida: Pesquisou arquivos do contexto');
    expect(prompt).toContain('Preencha decisionReason com uma justificativa curta e concreta da proxima acao.');
    expect(prompt).toContain('Use file_search quando o pedido mencionar arquivo');
    expect(prompt).toContain('Evite pedir esclarecimentos antes de tentar a melhor pesquisa interna disponível.');
  });

  it('forces a deterministic first tool_call for clear file lookup requests before consulting the model', async () => {
    const generateText = jest.fn();
    const service = makeServiceWithAi(generateText);

    const step = await (service as any).decideToolLoopStep({
      organizationId: 'org-1',
      configuredTextModel: {},
      agentName: 'Agente Pesquisa',
      userMessage: 'me diga o que tem no arquivo do currículo do adryan santos',
      flowConfig: {
        name: 'Fluxo',
        objective: 'Responder perguntas',
        instructions: '',
        fallbackMessage: '',
      },
      agentInstructions: null,
      agentNotes: null,
      contextPrompt: '',
      history: [],
      canExecuteWorkflow: false,
      workflowObjective: 'Responder perguntas',
      allowedTools: ['rag_search', 'file_search'],
      toolContextFrames: [],
    });

    expect(step).toMatchObject({
      action: 'tool_call',
      toolName: 'file_search',
      toolQuery: 'me diga o que tem no arquivo do currículo do adryan santos',
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it('does not force a search for identity questions and consults the model instead', async () => {
    const generateText = jest.fn().mockResolvedValue({
      text: '',
      structuredOutput: {
        action: 'respond',
        assistantMessage: 'Sou o agente Redator de Copy LinkedIn.',
        decisionReason: 'Pergunta sobre identidade do agente.',
        createRun: false,
        executionReason: '',
        toolName: 'none',
        toolQuery: '',
        events: [],
      },
    });
    const service = makeServiceWithAi(generateText);

    const step = await (service as any).decideToolLoopStep({
      organizationId: 'org-1',
      configuredTextModel: {},
      agentName: 'Redator de Copy LinkedIn',
      userMessage: 'voce é um agente do que?',
      flowConfig: { name: 'Fluxo', objective: '', instructions: '', fallbackMessage: '' },
      agentInstructions: null,
      agentNotes: null,
      contextPrompt: '',
      history: [],
      canExecuteWorkflow: false,
      workflowObjective: '',
      allowedTools: ['rag_search', 'file_search'],
      toolContextFrames: [],
    });

    expect(generateText).toHaveBeenCalledTimes(1);
    expect(step).toMatchObject({ action: 'respond' });
  });
});
