import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';

const makeMockInvitationService = () => ({
  findByOrganization: jest.fn(),
  create: jest.fn(),
  accept: jest.fn(),
  cancel: jest.fn(),
});

describe('InvitationController', () => {
  let controller: InvitationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [{ provide: InvitationService, useValue: makeMockInvitationService() }],
    }).compile();

    controller = module.get<InvitationController>(InvitationController);
  });

  it('rejects accept without userId', async () => {
    await expect(controller.accept('inv-1', {} as { userId: string })).rejects.toThrow(
      BadRequestException,
    );
  });
});
