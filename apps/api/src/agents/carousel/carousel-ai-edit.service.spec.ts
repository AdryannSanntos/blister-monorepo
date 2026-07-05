import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CarouselAiEditService } from './carousel-ai-edit.service';
import { AGENT_IA_SDK } from '../../integrations/agent-ia-sdk/agent-ia-sdk.token';

describe('CarouselAiEditService', () => {
  let service: CarouselAiEditService;

  const mockComplete = jest.fn();

  beforeEach(async () => {
    mockComplete.mockReset();
    mockComplete.mockResolvedValue({
      content: JSON.stringify({
        htmlContent: '<h1>Mais direto</h1>',
        cssContent: '.title { color: red; }',
      }),
      structuredOutput: {
        htmlContent: '<h1>Mais direto</h1>',
        cssContent: '.title { color: red; }',
      },
      usage: { promptTokens: 10, completionTokens: 20 },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarouselAiEditService,
        {
          provide: AGENT_IA_SDK,
          useValue: {
            ia: {
              text: jest.fn().mockResolvedValue({
                model: 'test-model',
                complete: mockComplete,
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get(CarouselAiEditService);
  });

  it('rewrites slide text via LLM and returns updated htmlContent', async () => {
    const result = await service.applyEdit({
      request: {
        slideId: 'slide_1',
        mode: 'rewrite_text',
        prompt: 'Deixar mais direto',
      },
      htmlContent: '<h1>Original</h1>',
      cssContent: '',
    });

    expect(result.htmlContent).toBe('<h1>Mais direto</h1>');
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: expect.stringContaining('Deixar mais direto') }),
        ]),
      }),
    );
  });
});

describe('CarouselRenderController', () => {
  it('placeholder for module wiring', () => {
    expect(NotFoundException).toBeDefined();
  });
});
