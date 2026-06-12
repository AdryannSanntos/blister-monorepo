import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { WorkspaceSettingsService } from './workspace-settings.service';

describe('WorkspaceSettingsService', () => {
  let service: WorkspaceSettingsService;
  let prisma: {
    workspaceSettings: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    agentWorkspaceSetting: {
      findFirst: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let workspaceContext: {
    ensurePersonalSpace: jest.Mock;
    resolveFromRequest: jest.Mock;
    ensureCompanyWorkspaceSettings: jest.Mock;
  };
  let marketplace: {
    getEntitlements: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      workspaceSettings: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      agentWorkspaceSetting: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
    };
    workspaceContext = {
      ensurePersonalSpace: jest.fn(),
      resolveFromRequest: jest.fn(),
      ensureCompanyWorkspaceSettings: jest.fn(),
    };
    marketplace = {
      getEntitlements: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceSettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkspaceContextService, useValue: workspaceContext },
        { provide: MarketplaceService, useValue: marketplace },
      ],
    }).compile();

    service = module.get(WorkspaceSettingsService);
  });

  it('returns personal settings profile', async () => {
    workspaceContext.ensurePersonalSpace.mockResolvedValue({ id: 'ps-1' });
    prisma.workspaceSettings.findUnique.mockResolvedValue({
      displayName: 'Test',
      niche: 'Food',
      audience: null,
      voice: null,
      positioning: null,
      contentPreferences: null,
      logoStorageKey: null,
      palette: ['#fff'],
      timezone: null,
    });

    const result = await service.getPersonalSettings('user-1');
    expect(result.displayName).toBe('Test');
    expect(result.palette).toEqual(['#fff']);
  });

  it('throws when personal settings missing', async () => {
    workspaceContext.ensurePersonalSpace.mockResolvedValue({ id: 'ps-1' });
    prisma.workspaceSettings.findUnique.mockResolvedValue(null);

    await expect(service.getPersonalSettings('user-1')).rejects.toThrow(NotFoundException);
  });

  it('returns cuts agent settings with defaults', async () => {
    workspaceContext.resolveFromRequest.mockResolvedValue({
      type: 'company',
      companyId: 'co-1',
    });
    prisma.agentWorkspaceSetting.findFirst.mockResolvedValue(null);

    const result = await service.getAgentSettings('user-1', {} as never, 'cuts');
    expect(result.agentId).toBe('cuts');
    expect(result.config.maxCuts).toBe(5);
  });
});
