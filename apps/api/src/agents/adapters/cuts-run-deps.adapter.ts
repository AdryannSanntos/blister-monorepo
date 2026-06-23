import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { AgentIaSdk } from '@company-os/agent-ia-sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { AGENT_IA_SDK } from '../../integrations/agent-ia-sdk/agent-ia-sdk.token';
import { buildCutsRunDeps } from '../cuts/build-cuts-run-deps';
import { setCutsRunDeps } from '../cuts/ports/cuts-run-deps';

@Injectable()
export class CutsRunDepsAdapter implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(AGENT_IA_SDK) private readonly sdk: AgentIaSdk,
  ) {}

  onModuleInit(): void {
    setCutsRunDeps(buildCutsRunDeps(this.prisma, this.storage, this.sdk));
  }
}
