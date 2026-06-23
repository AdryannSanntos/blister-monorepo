import type { PrismaClient } from '@company-os/db';

import { ModelNotFoundError } from '@company-os/agent-ia-sdk';

import { resolveCutsRankModel } from './resolve-cuts-model-tier';



const agentDefaultModel = {

  id: 'agent-default-model-id',

  externalId: 'gemini-3.1-flash-lite',

  isEnabled: true,

  capabilities: ['text', 'structured_output'],

  inputCostPer1k: 0.05,

  outputCostPer1k: 0.2,

  provider: { slug: 'assemblyai', isEnabled: true },

};



const stepOverrideModel = {

  id: 'step-override-model-id',

  externalId: 'gemini-2.5-flash',

  isEnabled: true,

  capabilities: ['text', 'structured_output'],

  inputCostPer1k: 0.075,

  outputCostPer1k: 0.3,

  provider: { slug: 'assemblyai', isEnabled: true },

};



const fakePrisma = (options: {

  stepPolicy?: { isEnabled: boolean; model: typeof agentDefaultModel } | null;

  agentPolicy?: { isEnabled: boolean; model: typeof agentDefaultModel } | null;

}): PrismaClient =>

  ({

    agentStepModelPolicy: {

      findUnique: async () => options.stepPolicy ?? null,

    },

    agentModelPolicy: {

      findUnique: async () => options.agentPolicy ?? null,

    },

  }) as unknown as PrismaClient;



describe('resolveCutsRankModel', () => {

  it('uses the agent default policy when no step override exists', async () => {

    const prisma = fakePrisma({

      stepPolicy: null,

      agentPolicy: { isEnabled: true, model: agentDefaultModel },

    });



    const resolved = await resolveCutsRankModel(prisma, 'basic');



    expect(resolved).toMatchObject({

      modelId: 'agent-default-model-id',

      providerSlug: 'assemblyai',

      externalModelId: 'gemini-3.1-flash-lite',

    });

  });



  it('prefers an enabled step policy over the agent default', async () => {

    const prisma = fakePrisma({

      stepPolicy: { isEnabled: true, model: stepOverrideModel },

      agentPolicy: { isEnabled: true, model: agentDefaultModel },

    });



    const resolved = await resolveCutsRankModel(prisma, 'basic');



    expect(resolved.externalModelId).toBe('gemini-2.5-flash');

  });



  it('normalizes auto and pro tiers to the same policy resolution path', async () => {

    const prisma = fakePrisma({

      stepPolicy: null,

      agentPolicy: { isEnabled: true, model: agentDefaultModel },

    });



    const autoResolved = await resolveCutsRankModel(prisma, 'auto');

    const proResolved = await resolveCutsRankModel(prisma, 'pro');



    expect(autoResolved.externalModelId).toBe('gemini-3.1-flash-lite');

    expect(proResolved.externalModelId).toBe('gemini-3.1-flash-lite');

  });



  it('falls back to agent policy when step override is disabled', async () => {
    const prisma = fakePrisma({
      stepPolicy: { isEnabled: false, model: stepOverrideModel },
      agentPolicy: { isEnabled: true, model: agentDefaultModel },
    });

    const resolved = await resolveCutsRankModel(prisma, 'basic');

    expect(resolved.externalModelId).toBe('gemini-3.1-flash-lite');
  });

  it('throws when no enabled policy is configured', async () => {

    const prisma = fakePrisma({

      stepPolicy: null,

      agentPolicy: null,

    });



    await expect(resolveCutsRankModel(prisma, 'basic')).rejects.toThrow(

      ModelNotFoundError,

    );

  });

});


