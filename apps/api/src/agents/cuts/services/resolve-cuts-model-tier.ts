import type { PrismaClient } from '@company-os/db';

import { resolveStepModel, type ResolvedModel } from '@company-os/agent-ia-sdk';

import { normalizeCutsModelTier, type CutsModelTier } from '@company-os/types';

import { logCutsDev } from '../cuts-dev-logger';



const RANK_STEP_KEY = 'rank_segments';

const RANK_REQUIRED_CAPABILITIES = ['text', 'structured_output'] as const;



// modelTier is normalized for API compatibility but does not select a model yet —
// all enabled tiers resolve through AgentStepModelPolicy / AgentModelPolicy.
// FUTURE: map pro/auto to distinct policies before calling resolveStepModel.



export const resolveCutsRankModel = async (

  prisma: PrismaClient,

  tier: CutsModelTier,

): Promise<ResolvedModel> => {

  const normalized = normalizeCutsModelTier(tier);



  logCutsDev('model-tier', 'Resolving rank model from catalog policies', {

    tier,

    normalized,

    stepKey: RANK_STEP_KEY,

  });



  const resolved = await resolveStepModel(prisma, {

    agentId: 'cuts',

    stepKey: RANK_STEP_KEY,

    requiredCapabilities: [...RANK_REQUIRED_CAPABILITIES],

  });



  logCutsDev('model-tier', 'Using policy-configured model', {

    tier: normalized,

    modelId: resolved.modelId,

    providerSlug: resolved.providerSlug,

    externalModelId: resolved.externalModelId,

  });



  return resolved;

};


