import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';
import { MembershipService } from '../organization/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { RagContextAssemblyService } from '../rag/rag-context-assembly.service';
import { AgentChatOrchestratorService } from './agent-chat-orchestrator.service';
import { AgentContextService } from './agent-context.service';
import { AgentToolRuntimeService } from './agent-tool-runtime.service';

describe('AgentChatOrchestratorService', () => {
  let service: AgentChatOrchestratorService;
  let aiRuntimeService: { generateText: jest.Mock };
  let agentToolRuntime: { run: jest.Mock };
  let membershipService: { getEffectivePermissionKeys: jest.Mock };
  let prisma: {
    companyAgent: { findFirst: jest.Mock };
    agentVersion: { findFirst: jest.Mock };
    agentChatThread: { findFirst: jest.Mock };
    agentChatMessage: { findMany: jest.Mock };
  };

  const baseInput = {
    organizationId: 'org-1',
    agentId: 'agent-1',
    userId: 'user-1',
    threadId: 'thread-1',
    message: 'como estruturar esse briefing?',
  };

  beforeEach(async () => {
    aiRuntimeService = {
      generateText: jest.fn(),
    };
    agentToolRuntime = {
      run: jest.fn(),
    };
    membershipService = {
      getEffectivePermissionKeys: jest.fn().mockResolvedValue(['context.read', 'brain.read']),
    };

    prisma = {
      companyAgent: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'agent-1',
          name: 'Consultor',
          activeVersionId: 'version-1',
        }),
      },
      agentVersion: {
        findFirst: jest.fn().mockResolvedValue({
          flowDefinition: {
            config: {
              name: 'Fluxo principal',
              objective: 'Gerar briefings',
              instructions: 'Tom consultivo',
              fallbackMessage: 'Tente novamente.',
            },
          },
        }),
      },
      agentChatThread: {
        findFirst: jest.fn().mockResolvedValue({ id: 'thread-1' }),
      },
      agentChatMessage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatOrchestratorService,
        { provide: PrismaService, useValue: prisma },
        { provide: AIRuntimeService, useValue: aiRuntimeService },
        {
          provide: AgentContextService,
          useValue: {
            resolveForRun: jest.fn().mockResolvedValue({
              agentProfile: { instructions: 'Seja direto', notes: null },
            }),
          },
        },
        {
          provide: RagContextAssemblyService,
          useValue: {
            assemble: jest.fn().mockResolvedValue({ chunks: [], query: '', totalFound: 0 }),
            formatForPrompt: jest.fn().mockReturnValue(''),
          },
        },
        { provide: AgentToolRuntimeService, useValue: agentToolRuntime },
        { provide: MembershipService, useValue: membershipService },
      ],
    }).compile();

    service = module.get(AgentChatOrchestratorService);
  });

  it('throws when agent is missing', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue(null);

    await expect(service.orchestrateMessage(baseInput)).rejects.toThrow(NotFoundException);
  });

  it('returns conversational turn with assistant message from the model', async () => {
    aiRuntimeService.generateText.mockResolvedValue({
      text: JSON.stringify({
        createRun: false,
        assistantMessage: 'Eu estruturaria em contexto, proposta e entrega.',
        events: [{ type: 'intent_classified', label: 'Conversa operacional' }],
      }),
    });

    const result = await service.orchestrateMessage(baseInput);

    expect(result.createRun).toBe(false);
    expect(result.mode).toBe('conversation');
    expect(result.assistantMessage).toContain('estruturaria');
    expect(aiRuntimeService.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        structuredOutputSchema: expect.any(Object),
      }),
    );
  });

  it('promotes workflow execution when the model decides so', async () => {
    aiRuntimeService.generateText.mockResolvedValue({
      text: JSON.stringify({
        createRun: true,
        assistantMessage: 'Perfeito — vou executar o workflow para gerar o briefing final.',
        executionReason: 'Pedido de entrega via workflow',
        events: [{ type: 'intent_classified', label: 'Execução necessária' }],
      }),
    });

    const result = await service.orchestrateMessage({
      ...baseInput,
      message: 'gere agora o briefing final em formato de entrega',
    });

    expect(result.createRun).toBe(true);
    expect(result.mode).toBe('execution');
    expect(result.assistantMessage).toContain('workflow');
    expect(result.events.some((event) => event.type === 'execution_decided')).toBe(true);
  });

  it('falls back to a generic contingency message when all model calls fail', async () => {
    aiRuntimeService.generateText.mockRejectedValue(new Error('provider down'));

    const result = await service.orchestrateMessage({
      ...baseInput,
      message: 'olá',
    });

    expect(result.assistantMessage).toContain('instabilidade');
    expect(result.assistantMessage).not.toContain('email');
    expect(result.events.some((event) => event.label === 'Resposta de contingência')).toBe(true);
  });

  it('runs the tool loop and returns tool parts without creating a run', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      name: 'Consultor',
      activeVersionId: 'version-1',
      allowedTools: ['rag_search'],
    });

    agentToolRuntime.run.mockResolvedValue({
      toolName: 'rag_search',
      summary: 'Encontrados 1 trechos relevantes.',
      results: [{ title: 'Reembolsos', snippet: 'Reembolsos em 7 dias.' }],
      citations: [{ label: 'Reembolsos', sourceType: 'brain_entry' }],
      metadata: { durationMs: 12, resultCount: 1 },
    });

    aiRuntimeService.generateText
      .mockResolvedValueOnce({
        text: JSON.stringify({
          action: 'tool_call',
          assistantMessage: '',
          createRun: false,
          executionReason: '',
          toolName: 'rag_search',
          toolQuery: 'política de reembolso',
          events: [],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          action: 'respond',
          assistantMessage: 'O reembolso acontece em até 7 dias.',
          createRun: false,
          executionReason: '',
          toolName: 'none',
          toolQuery: '',
          events: [{ type: 'intent_classified', label: 'Resposta gerada' }],
        }),
      });

    const result = await service.orchestrateMessage({
      ...baseInput,
      message: 'qual a política de reembolso?',
    });

    expect(agentToolRuntime.run).toHaveBeenCalledTimes(1);
    expect(result.createRun).toBe(false);
    expect(result.toolParts).toHaveLength(1);
    expect(result.toolParts[0]).toMatchObject({ type: 'tool-Search', state: 'output-available' });
    expect(result.toolCalls[0]).toMatchObject({ toolName: 'rag_search', status: 'completed' });
    expect(result.citations[0]).toMatchObject({ label: 'Reembolsos' });
    expect(result.assistantMessage).toContain('7 dias');
  });

  it('degrades gracefully when a tool fails during the loop', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      name: 'Consultor',
      activeVersionId: 'version-1',
      allowedTools: ['rag_search'],
    });

    agentToolRuntime.run.mockRejectedValue(new Error('rag down'));

    aiRuntimeService.generateText
      .mockResolvedValueOnce({
        text: JSON.stringify({
          action: 'tool_call',
          assistantMessage: '',
          createRun: false,
          executionReason: '',
          toolName: 'rag_search',
          toolQuery: 'reembolso',
          events: [],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          action: 'respond',
          assistantMessage: 'Não consegui consultar o contexto, mas posso ajudar mesmo assim.',
          createRun: false,
          executionReason: '',
          toolName: 'none',
          toolQuery: '',
          events: [],
        }),
      });

    const result = await service.orchestrateMessage({
      ...baseInput,
      message: 'qual a política de reembolso?',
    });

    expect(result.toolParts[0]).toMatchObject({ state: 'output-error' });
    expect(result.toolCalls[0]).toMatchObject({ status: 'error', errorMessage: 'rag down' });
    expect(result.assistantMessage).toContain('ajudar');
  });

  it('never creates a run when the agent has no active version', async () => {
    prisma.companyAgent.findFirst.mockResolvedValue({
      id: 'agent-1',
      name: 'Consultor',
      activeVersionId: null,
    });
    prisma.agentVersion.findFirst.mockResolvedValue(null);

    aiRuntimeService.generateText.mockResolvedValue({
      text: JSON.stringify({
        createRun: true,
        assistantMessage: 'Vou executar agora.',
        executionReason: 'Entrega',
        events: [],
      }),
    });

    const result = await service.orchestrateMessage({
      ...baseInput,
      message: 'gere o briefing final',
    });

    expect(result.createRun).toBe(false);
    expect(result.mode).toBe('conversation');
  });
});
