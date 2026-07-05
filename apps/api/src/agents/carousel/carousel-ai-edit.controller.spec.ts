import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { CarouselAiEditController } from './carousel-ai-edit.controller';
import { CarouselAiEditService } from './carousel-ai-edit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../workspace/workspace-context.service';
import { AgentRunService } from '../runtime/agent-run.service';

describe('CarouselAiEditController', () => {
  let controller: CarouselAiEditController;

  const applyEdit = jest.fn().mockResolvedValue({
    htmlContent: '<h1>From service</h1>',
    cssContent: '.title { color: blue; }',
  });

  const persistedSlide = {
    id: 'slide_1',
    order: 0,
    type: 'text',
    htmlContent: '<h1>Persisted (stale)</h1>',
    cssContent: '.title { color: red; }',
  };

  const findFirst = jest.fn().mockResolvedValue({
    id: 'run_1',
    outputPayload: {
      socialNetwork: 'instagram',
      templateId: 'content-machine',
      slides: [persistedSlide],
    },
  });

  const request = {
    currentUser: { id: 'user_1' },
  } as unknown as Request;

  beforeEach(async () => {
    applyEdit.mockClear();
    findFirst.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarouselAiEditController],
      providers: [
        { provide: PrismaService, useValue: { agentRun: { findFirst } } },
        {
          provide: WorkspaceContextService,
          useValue: { resolveFromRequest: jest.fn().mockResolvedValue({ companyId: 'company_1' }) },
        },
        {
          provide: AgentRunService,
          useValue: { assertRunBelongsToWorkspace: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: CarouselAiEditService, useValue: { applyEdit } },
      ],
    }).compile();

    controller = module.get(CarouselAiEditController);
  });

  it('uses the persisted slide content when no current content is sent in the body', async () => {
    await controller.aiEditSlide(
      'run_1',
      { slideId: 'slide_1', mode: 'rewrite_text', prompt: 'Deixar mais direto' },
      request,
    );

    expect(applyEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        htmlContent: persistedSlide.htmlContent,
        cssContent: persistedSlide.cssContent,
      }),
    );
  });

  it('prefers the unsaved editor content sent in the body over the persisted slide', async () => {
    await controller.aiEditSlide(
      'run_1',
      {
        slideId: 'slide_1',
        mode: 'rewrite_text',
        prompt: 'Deixar mais direto',
        currentHtmlContent: '<h1>Unsaved edit</h1>',
        currentCssContent: '.title { color: green; }',
      },
      request,
    );

    expect(applyEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        htmlContent: '<h1>Unsaved edit</h1>',
        cssContent: '.title { color: green; }',
      }),
    );
  });

  it('throws BadRequestException when the run output is not in the expected carousel format', async () => {
    findFirst.mockResolvedValueOnce({
      id: 'run_1',
      outputPayload: { not: 'a valid carousel output' },
    });

    await expect(
      controller.aiEditSlide(
        'run_1',
        { slideId: 'slide_1', mode: 'rewrite_text', prompt: 'Deixar mais direto' },
        request,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(applyEdit).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when mode is outside the allowed enum', async () => {
    await expect(
      controller.aiEditSlide(
        'run_1',
        { slideId: 'slide_1', mode: 'delete_slide', prompt: 'Deixar mais direto' },
        request,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(applyEdit).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when prompt is empty', async () => {
    await expect(
      controller.aiEditSlide(
        'run_1',
        { slideId: 'slide_1', mode: 'rewrite_text', prompt: '' },
        request,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(applyEdit).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when slideId is missing', async () => {
    await expect(
      controller.aiEditSlide(
        'run_1',
        { mode: 'rewrite_text', prompt: 'Deixar mais direto' },
        request,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(applyEdit).not.toHaveBeenCalled();
  });
});
