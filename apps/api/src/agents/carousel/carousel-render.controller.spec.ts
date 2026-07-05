import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { CarouselRenderController } from './carousel-render.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../workspace/workspace-context.service';
import { AgentRunService } from '../runtime/agent-run.service';
import { resetCarouselRunDeps, setCarouselRunDeps } from './ports/carousel-run-deps';

describe('CarouselRenderController', () => {
  let controller: CarouselRenderController;

  const persistedSlide = {
    id: 'slide_1',
    order: 0,
    type: 'text',
    htmlContent: '<h1>Slide</h1>',
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

  const update = jest.fn().mockResolvedValue({});

  const request = {
    currentUser: { id: 'user_1' },
  } as unknown as Request;

  beforeEach(async () => {
    findFirst.mockClear();
    update.mockClear();

    setCarouselRunDeps({
      templateService: {} as never,
      renderSlideToPng: jest.fn().mockResolvedValue(Buffer.from('png')),
      resolveFileUrl: jest.fn().mockResolvedValue('https://example.com/file.png'),
      storeRenderedPng: jest.fn().mockResolvedValue('file_1'),
      listOwnedTemplateIds: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarouselRenderController],
      providers: [
        { provide: PrismaService, useValue: { agentRun: { findFirst, update } } },
        {
          provide: WorkspaceContextService,
          useValue: { resolveFromRequest: jest.fn().mockResolvedValue({ companyId: 'company_1' }) },
        },
        {
          provide: AgentRunService,
          useValue: { assertRunBelongsToWorkspace: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get(CarouselRenderController);
  });

  afterEach(() => {
    resetCarouselRunDeps();
  });

  it('renders the requested slides and persists the pngFileId', async () => {
    const result = await controller.renderRun('run_1', {}, request);

    expect(result.slides).toHaveLength(1);
    expect(result.slides[0]).toEqual(expect.objectContaining({ pngFileId: 'file_1' }));
    expect(update).toHaveBeenCalled();
  });

  it('throws BadRequestException when the run output is not in the expected carousel format', async () => {
    findFirst.mockResolvedValueOnce({
      id: 'run_1',
      outputPayload: { not: 'a valid carousel output' },
    });

    await expect(controller.renderRun('run_1', {}, request)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException (not a raw ZodError) when slideIds is not an array', async () => {
    await expect(
      controller.renderRun('run_1', { slideIds: 'slide_1' }, request),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the body contains an unexpected shape', async () => {
    await expect(
      controller.renderRun('run_1', { slideIds: [123] }, request),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
  });
});
