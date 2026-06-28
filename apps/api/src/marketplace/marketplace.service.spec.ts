import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credits/credits.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let prisma: {
    marketplaceItem: { findFirst: jest.Mock; findMany: jest.Mock };
    workspaceEntitlement: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    personalCreditBalance: { findUnique: jest.Mock; update: jest.Mock };
  };
  let workspaceContext: { resolveFromRequest: jest.Mock };
  let credits: { checkBalance: jest.Mock; debit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      marketplaceItem: { findFirst: jest.fn(), findMany: jest.fn() },
      workspaceEntitlement: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      personalCreditBalance: { findUnique: jest.fn(), update: jest.fn() },
    };
    workspaceContext = { resolveFromRequest: jest.fn() };
    credits = { checkBalance: jest.fn(), debit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkspaceContextService, useValue: workspaceContext },
        { provide: CreditService, useValue: credits },
      ],
    }).compile();

    service = module.get(MarketplaceService);
  });

  it('redeems free item for company workspace', async () => {
    workspaceContext.resolveFromRequest.mockResolvedValue({
      type: 'company',
      companyId: 'co-1',
      userId: 'user-1',
    });
    prisma.marketplaceItem.findFirst.mockResolvedValue({
      id: 'item-1',
      slug: 'free-style',
      type: 'EDIT_STYLE',
      name: 'Free Style',
      author: 'Blister',
      price: 0,
      flag: null,
      description: 'desc',
      palette: [],
      specs: {},
      includes: [],
      refId: null,
    });
    prisma.workspaceEntitlement.findFirst.mockResolvedValue(null);
    prisma.workspaceEntitlement.create.mockResolvedValue({});

    const result = await service.redeem('user-1', {} as never, 'item-1');
    expect(result.owned).toBe(true);
    expect(prisma.workspaceEntitlement.create).toHaveBeenCalled();
  });

  it('rejects redeem when already owned', async () => {
    workspaceContext.resolveFromRequest.mockResolvedValue({
      type: 'company',
      companyId: 'co-1',
      userId: 'user-1',
    });
    prisma.marketplaceItem.findFirst.mockResolvedValue({
      id: 'item-1',
      slug: 'style',
      type: 'EDIT_STYLE',
      name: 'Style',
      author: 'Blister',
      price: 0,
      flag: null,
      description: 'desc',
      palette: [],
      specs: {},
      includes: [],
      refId: null,
    });
    prisma.workspaceEntitlement.findFirst.mockResolvedValue({ id: 'ent-1' });

    await expect(service.redeem('user-1', {} as never, 'item-1')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws when item not found', async () => {
    workspaceContext.resolveFromRequest.mockResolvedValue({
      type: 'company',
      companyId: 'co-1',
      userId: 'user-1',
    });
    prisma.marketplaceItem.findFirst.mockResolvedValue(null);

    await expect(service.redeem('user-1', {} as never, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
