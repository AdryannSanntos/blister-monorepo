import { task, logger } from '@trigger.dev/sdk';

import { PrismaClient } from '@company-os/db';

import { z } from 'zod';

import {

  executeRun,

  HttpEventPublisher,

  NoOpEventPublisher,

  createTriggerLlmProvider,

  type ExecutionDependencies,

} from '../src/agents/runtime/kernel';

import { AgentRunBlockService } from '../src/agents/runtime/agent-run-block.service';

import {

  assertCutsLiveProviders,

  hasLlmProviderConfigured,

  warnTriggerAppUrl,

} from '../src/agents/runtime/agent-provider-guards';

import { PrismaService } from '../src/prisma/prisma.service';

import { buildCutsRunDeps } from '../src/agents/cuts/build-cuts-run-deps';

import { setCutsRunDeps } from '../src/agents/cuts/ports/cuts-run-deps';

import { buildCarouselRunDeps } from '../src/agents/carousel/build-carousel-run-deps';

import { setCarouselRunDeps } from '../src/agents/carousel/ports/carousel-run-deps';

import { CarouselRenderService } from '../src/agents/carousel/services/carousel-render.service';

import { CarouselTemplateService } from '../src/agents/carousel/services/carousel-template.service';

import { ConfigService } from '@nestjs/config';

import { StorageService } from '../src/storage/storage.service';

import { createAgentIaSdk } from '@company-os/agent-ia-sdk';

import { loadProviderSecrets } from '../src/integrations/agent-ia-sdk/load-provider-secrets';

import { devAgentLogger } from '../src/agents/runtime/dev-agent-logger';
import { isTransientUserFacingProviderError } from '../src/agents/runtime/kernel/provider-error-message';
import { requeueFailedAgentRun } from '../src/agents/runtime/requeue-failed-agent-run';



const prisma = new PrismaClient();



const executePayloadSchema = z.object({

  runId: z.string().min(1),

  resumeFromStep: z.string().optional(),

  formData: z.record(z.string(), z.unknown()).optional(),

});



export type ExecutePayload = z.infer<typeof executePayloadSchema>;



export interface ExecuteResult {

  runId: string;

  status: 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELLED' | 'RUNNING';

  outputPayload?: Record<string, unknown>;

  errorMessage?: string;

  pauseReason?: string;

  creditCost?: number;

}



function createEventPublisher() {

  const appUrl = process.env.APP_URL;

  const triggerSecret = process.env.TRIGGER_SECRET_KEY;



  warnTriggerAppUrl(

    'trigger',

    appUrl,

    process.env.PORT ?? '3001',

    (message) => logger.warn(message),

  );



  if (appUrl) {

    return new HttpEventPublisher(appUrl, triggerSecret);

  }



  return new NoOpEventPublisher();

}



export const agentRunExecute = task({

  id: 'agent-run-execute',

  maxDuration: 2700,

  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },

  run: async (payload: ExecutePayload): Promise<ExecuteResult> => {

    const validated = executePayloadSchema.parse(payload);



    logger.info('Starting agent run execution', {

      runId: validated.runId,

      resumeFromStep: validated.resumeFromStep,

      hasFormData: Boolean(validated.formData && Object.keys(validated.formData).length > 0),

      hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),

      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),

      hasAssemblyAiKey: Boolean(process.env.ASSEMBLYAI_API_KEY),

    });



    try {

      const runRecord = await prisma.agentRun.findUnique({
        where: { id: validated.runId },
        select: {
          status: true,
          agentId: true,
          companyId: true,
          personalSpaceId: true,
          errorMessage: true,
        },
      });



      if (!runRecord) {

        const message = `Agent run not found: ${validated.runId}`;

        devAgentLogger.error(message, undefined, { runId: validated.runId });

        throw new Error(message);

      }



      devAgentLogger.log('Trigger worker claimed run', {

        runId: validated.runId,

        agentId: runRecord.agentId,

        status: runRecord.status,

        resumeFromStep: validated.resumeFromStep,

      });



      if (runRecord.status === 'RUNNING') {
        logger.info('Run already running, skipping retry', { runId: validated.runId });
        return { runId: validated.runId, status: 'RUNNING' as const };
      }

      if (
        runRecord.status === 'FAILED' &&
        isTransientUserFacingProviderError(runRecord.errorMessage ?? '')
      ) {
        await requeueFailedAgentRun(prisma, validated.runId);
        devAgentLogger.log('Re-queued failed run for Trigger retry', {
          runId: validated.runId,
          errorMessage: runRecord.errorMessage,
        });
      }



      if (runRecord.agentId === 'cuts') {

        assertCutsLiveProviders('trigger');

      }



      const config = new ConfigService();

      const sdk = createAgentIaSdk({

        prisma,

        secrets: loadProviderSecrets(config),

      });



      const storage = new StorageService(config);

      setCutsRunDeps(buildCutsRunDeps(prisma, storage, sdk));

      const carouselTemplateService = new CarouselTemplateService();

      const carouselRenderService = new CarouselRenderService();

      setCarouselRunDeps(
        buildCarouselRunDeps(prisma, storage, carouselTemplateService, carouselRenderService),
      );



      const useLiveProviders = hasLlmProviderConfigured();



      devAgentLogger.log('Execution environment ready', {

        runId: validated.runId,

        agentId: runRecord.agentId,

        useLiveProviders,

        hasAppUrl: Boolean(process.env.APP_URL),

      });



      const agentRunBlockService = new AgentRunBlockService(

        prisma as unknown as PrismaService,

      );



      const deps: ExecutionDependencies = {

        prisma,

        llmProvider: useLiveProviders ? createTriggerLlmProvider(sdk) : null,

        imageProvider: null,

        eventPublisher: createEventPublisher(),

        blocks: agentRunBlockService,

      };



      const result = await executeRun(deps, {

        runId: validated.runId,

        resumeFromStep: validated.resumeFromStep,

        formData: validated.formData,

      });



      logger.info('Agent run execution completed', {

        runId: result.runId,

        status: result.status,

        creditCost: result.creditCost,

        errorMessage: result.errorMessage,

        pauseReason: result.pauseReason,

      });



      if (result.status === 'FAILED') {
        const failureMessage =
          result.errorMessage ?? `Agent run ${validated.runId} failed`;

        devAgentLogger.error('Agent run failed', undefined, {
          runId: result.runId,
          errorMessage: failureMessage,
          creditCost: result.creditCost,
        });

        throw new Error(failureMessage);
      }

      return {

        runId: result.runId,

        status: result.status as ExecuteResult['status'],

        outputPayload: result.outputPayload,

        errorMessage: result.errorMessage,

        pauseReason: result.pauseReason,

        creditCost: result.creditCost,

      };

    } catch (error) {

      devAgentLogger.error('Unhandled error during agent run execution', error, {

        runId: validated.runId,

        resumeFromStep: validated.resumeFromStep,

      });

      throw error;

    }

  },

});


