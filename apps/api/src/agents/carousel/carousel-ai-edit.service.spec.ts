import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CarouselAiEditService } from './carousel-ai-edit.service';
import { CarouselTemplateService } from './services/carousel-template.service';
import { AGENT_IA_SDK } from '../../integrations/agent-ia-sdk/agent-ia-sdk.token';

describe('CarouselAiEditService', () => {
  let service: CarouselAiEditService;

  const mockComplete = jest.fn();
  const getInstructions = jest.fn();
  const getAvailableVariations = jest.fn();
  const getSlideVariation = jest.fn();

  beforeEach(async () => {
    mockComplete.mockReset();
    getInstructions.mockReset().mockReturnValue('# Minimal Clean\nUse system-ui bold.');
    getAvailableVariations.mockReset().mockReturnValue(['v1']);
    getSlideVariation.mockReset().mockReturnValue({
      html: '<h1>{{title}}</h1>',
      css: '.title { font-weight: 900; }',
    });
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
          provide: CarouselTemplateService,
          useValue: { getInstructions, getAvailableVariations, getSlideVariation },
        },
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
      templateId: 'minimal-clean',
      slideType: 'text',
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

  it('injects the chosen template instructions and example slide as reference', async () => {
    await service.applyEdit({
      request: { slideId: 'slide_1', mode: 'visual_edit', prompt: 'Mais contraste' },
      templateId: 'minimal-clean',
      slideType: 'text',
      htmlContent: '<h1>Original</h1>',
      cssContent: '',
    });

    expect(getInstructions).toHaveBeenCalledWith('minimal-clean');
    expect(getAvailableVariations).toHaveBeenCalledWith('minimal-clean', 'text');
    const userMessage = mockComplete.mock.calls[0][0].messages.find(
      (m: { role: string }) => m.role === 'user',
    );
    expect(userMessage.content).toContain('minimal-clean');
    expect(userMessage.content).toContain('Use system-ui bold.');
    expect(userMessage.content).toContain('font-weight: 900');
  });

  it('degrades gracefully when the template cannot be loaded', async () => {
    getInstructions.mockImplementation(() => {
      throw new Error('not found');
    });
    getAvailableVariations.mockImplementation(() => {
      throw new Error('not found');
    });

    const result = await service.applyEdit({
      request: { slideId: 'slide_1', mode: 'rewrite_text', prompt: 'Encurtar texto' },
      templateId: 'unknown',
      slideType: 'text',
      htmlContent: '<h1>Original</h1>',
      cssContent: '',
    });

    expect(result.htmlContent).toBe('<h1>Mais direto</h1>');
  });
});

describe('CarouselRenderController', () => {
  it('placeholder for module wiring', () => {
    expect(NotFoundException).toBeDefined();
  });
});
