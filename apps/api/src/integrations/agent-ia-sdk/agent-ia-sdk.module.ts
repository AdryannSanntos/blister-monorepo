import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAgentIaSdk } from '@company-os/agent-ia-sdk';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AGENT_IA_SDK } from './agent-ia-sdk.token';
import { loadProviderSecrets } from './load-provider-secrets';

/**
 * Bootstraps the single `AgentIaSdk` instance for the whole app: feeds it the
 * Prisma client and env-loaded provider secrets. `@Global` so any module can
 * `@Inject(AGENT_IA_SDK)` without importing this module.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: AGENT_IA_SDK,
      useFactory: (prisma: PrismaService, config: ConfigService) =>
        createAgentIaSdk({ prisma, secrets: loadProviderSecrets(config) }),
      inject: [PrismaService, ConfigService],
    },
  ],
  exports: [AGENT_IA_SDK],
})
export class AgentIaSdkModule {}
