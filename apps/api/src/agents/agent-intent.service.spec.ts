import { Test, type TestingModule } from '@nestjs/testing';
import { AgentIntentService } from './agent-intent.service';

describe('AgentIntentService', () => {
  let service: AgentIntentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentIntentService],
    }).compile();
    service = module.get(AgentIntentService);
  });

  // ---------------------------------------------------------------------------
  // Modo execução — comportamento padrão
  // ---------------------------------------------------------------------------

  it('classifies task-like messages as execution', async () => {
    const cases = [
      'Monte um plano de execução para esta demanda',
      'Gere a primeira resposta já com tom profissional',
      'Liste o contexto que você ainda precisa antes de executar',
      'Crie um relatório de vendas do mês',
      'Analise os dados e me diga os pontos críticos',
      'Escreva um email para o cliente sobre o atraso',
      'Faça um resumo do documento anexado',
      'Elabore uma proposta comercial',
      'Revise o contrato e aponte os riscos',
    ];

    for (const message of cases) {
      const result = await service.classify({ message });
      expect(result.mode).toBe('execution');
      expect(result.reason).toBe('task_requested');
    }
  });

  it('classifies messages with questions as execution', async () => {
    const result = await service.classify({
      message: 'Qual é a melhor estratégia para este projeto?',
    });
    expect(result.mode).toBe('execution');
  });

  it('classifies long messages as execution', async () => {
    const result = await service.classify({
      message:
        'Preciso que você analise o contexto da empresa e gere um plano detalhado com 5 etapas.',
    });
    expect(result.mode).toBe('execution');
  });

  it('treats empty string as execution (boundary)', async () => {
    const result = await service.classify({ message: '   ' });
    // string vazia após trim — não é conversational pattern, vai para execution
    expect(result.mode).toBe('execution');
  });

  // ---------------------------------------------------------------------------
  // Modo conversacional — saudações e respostas curtas
  // ---------------------------------------------------------------------------

  it('classifies greetings as conversational', async () => {
    const cases = ['oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'Oi!', 'Olá!'];

    for (const message of cases) {
      const result = await service.classify({ message });
      expect(result.mode).toBe('conversational');
      expect(result.reason).toBe('conversation_only');
    }
  });

  it('classifies time-of-day greetings as conversational', async () => {
    const cases = ['bom dia', 'boa tarde', 'boa noite', 'tudo bem'];

    for (const message of cases) {
      const result = await service.classify({ message });
      expect(result.mode).toBe('conversational');
    }
  });

  it('classifies acknowledgement messages as conversational', async () => {
    const cases = [
      'obrigado',
      'obrigada',
      'valeu',
      'thanks',
      'thank you',
      'ok',
      'okay',
      'certo',
      'entendi',
      'entendido',
      'show',
      'beleza',
    ];

    for (const message of cases) {
      const result = await service.classify({ message });
      expect(result.mode).toBe('conversational');
    }
  });

  it('classifies greeting with punctuation as conversational', async () => {
    const result = await service.classify({ message: 'Olá.' });
    expect(result.mode).toBe('conversational');
  });

  it('classifies greeting with extra whitespace as conversational', async () => {
    const result = await service.classify({ message: '  oi  ' });
    expect(result.mode).toBe('conversational');
  });

  // ---------------------------------------------------------------------------
  // Borderline: saudações seguidas de tarefa devem ser execution
  // ---------------------------------------------------------------------------

  it('classifies greeting + task as execution', async () => {
    const result = await service.classify({ message: 'oi, pode me ajudar com um relatório?' });
    expect(result.mode).toBe('execution');
  });

  it('classifies "obrigado" with additional context as execution', async () => {
    const result = await service.classify({ message: 'obrigado, agora revise o texto' });
    expect(result.mode).toBe('execution');
  });

  // ---------------------------------------------------------------------------
  // Estrutura da resposta
  // ---------------------------------------------------------------------------

  it('always returns mode and reason fields', async () => {
    const result = await service.classify({ message: 'qualquer coisa' });
    expect(result).toHaveProperty('mode');
    expect(result).toHaveProperty('reason');
    expect(['execution', 'conversational']).toContain(result.mode);
    expect(['task_requested', 'conversation_only']).toContain(result.reason);
  });
});
