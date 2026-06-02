import { initialMessagesAgent } from './initial-messages.agent';
import { SystemAgentRunnerService } from './system-agent-runner.service';
import { threadTitleAgent } from './thread-title.agent';

const makeRuntime = () => ({ generateText: jest.fn() });

describe('SystemAgentRunnerService', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let runner: SystemAgentRunnerService;

  beforeEach(() => {
    runtime = makeRuntime();
    runner = new SystemAgentRunnerService(runtime as any);
  });

  it('returns completed with the sanitized title from structured output', async () => {
    runtime.generateText.mockResolvedValue({
      text: '',
      structuredOutput: { title: '"Plano de post no LinkedIn."' },
    });

    const result = await runner.run(threadTitleAgent, threadTitleAgent.sampleInput, {});

    expect(result.status).toBe('completed');
    expect(result.data).toEqual({ title: 'Plano de post no LinkedIn' });
    expect(result.finishedAt).not.toBeNull();
  });

  it('parses JSON embedded in text when structuredOutput is absent', async () => {
    runtime.generateText.mockResolvedValue({
      text: 'Aqui: {"title":"Briefing de campanha"}',
      structuredOutput: undefined,
    });

    const result = await runner.run(threadTitleAgent, threadTitleAgent.sampleInput, {});

    expect(result.status).toBe('completed');
    expect(result.data).toEqual({ title: 'Briefing de campanha' });
  });

  it('returns failed when the model call throws', async () => {
    runtime.generateText.mockRejectedValue(new Error('provider down'));

    const result = await runner.run(threadTitleAgent, threadTitleAgent.sampleInput, {});

    expect(result.status).toBe('failed');
    expect(result.data).toBeNull();
    expect(result.errorMessage).toBe('provider down');
  });

  it('returns failed when output does not match the schema', async () => {
    runtime.generateText.mockResolvedValue({ text: '{"unexpected":true}', structuredOutput: {} });

    const result = await runner.run(threadTitleAgent, threadTitleAgent.sampleInput, {});

    expect(result.status).toBe('failed');
  });

  it('runs on the resilient path: no native structured-output requirement, prefers free models, injects a JSON instruction', async () => {
    runtime.generateText.mockResolvedValue({
      text: '{"title":"Plano de conteúdo"}',
      structuredOutput: undefined,
    });

    await runner.run(threadTitleAgent, threadTitleAgent.sampleInput, { organizationId: 'org-1' });

    const call = runtime.generateText.mock.calls[0][0];
    expect(call.requireStructuredOutput).toBe(false);
    expect(call.preferLowCost).toBe(true);
    expect(call.structuredOutputSchema).toBe(threadTitleAgent.outputSchema);
    // A última mensagem é a instrução de JSON estrito acrescentada pelo runner.
    const lastMessage = call.messages[call.messages.length - 1];
    expect(lastMessage.role).toBe('system');
    expect(lastMessage.content).toContain('JSON');
  });

  it('applies the model override (provider/model) from context', async () => {
    runtime.generateText.mockResolvedValue({
      text: '',
      structuredOutput: { title: 'Teste de override' },
    });

    await runner.run(threadTitleAgent, threadTitleAgent.sampleInput, {
      organizationId: 'org-1',
      modelOverride: { providerId: 'prov-9', modelId: 'model-9', temperature: 0.1 },
    });

    expect(runtime.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        providerId: 'prov-9',
        modelId: 'model-9',
        temperature: 0.1,
      }),
    );
  });

  it('cleans, de-duplicates and caps initial messages at 5', async () => {
    runtime.generateText.mockResolvedValue({
      text: '',
      structuredOutput: {
        messages: [
          '1. Escreva um post sobre lançamento',
          'Escreva um post sobre lançamento',
          'Crie uma copy para anúncio',
          'Revise meu texto de vendas',
          'Sugira títulos chamativos',
          'Monte um calendário editorial',
        ],
      },
    });

    const result = await runner.run(initialMessagesAgent, initialMessagesAgent.sampleInput, {});

    expect(result.status).toBe('completed');
    expect(result.data?.messages).toHaveLength(5);
    expect(result.data?.messages?.[0]).toBe('Escreva um post sobre lançamento');
  });
});
