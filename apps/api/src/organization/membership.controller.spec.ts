import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

const makeMockMembershipService = () => ({
  findByOrganization: jest.fn(),
  addRole: jest.fn(),
  removeRole: jest.fn(),
  setOverride: jest.fn(),
  removeOverride: jest.fn(),
});

describe('MembershipController', () => {
  let controller: MembershipController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [{ provide: MembershipService, useValue: makeMockMembershipService() }],
    }).compile();

    controller = module.get<MembershipController>(MembershipController);
  });

  it('rejects override with invalid permission payload', async () => {
    await expect(
      controller.setOverride('mem-1', { key: 'invalid.permission', effect: 'grant' } as never),
    ).rejects.toThrow(BadRequestException);
  });
});
