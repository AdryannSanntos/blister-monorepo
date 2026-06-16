import type { PrismaClient } from '../../generated/prisma';
import { transcribeWithAssemblyAi } from '../../ai-runtime/adapters/assemblyai-stt.adapter';
import { resolveStepSpeechModel } from '../../ai-runtime/resolve-model';
import type { StorageService } from '../../storage/storage.service';
import { readAgentExecutionMode } from '../runtime/agent-execution-mode';
import {
  createStubCutsRunDeps,
  type CutsRunDeps,
  type SourceFileRecord,
} from './ports/cuts-run-deps';
import { renderCutClipsWithDeps } from './services/render-cut-clips.service';

export type CutsRunDepsEnv = {
  assemblyAiApiKey?: string;
  assemblyAiBaseUrl?: string;
};

const isVideoMimeType = (mimeType: string): boolean => mimeType.startsWith('video/');

/**
 * Builds production cuts dependencies (DB file lookup, AssemblyAI STT, FFmpeg/Trigger render).
 * Used by NestJS on boot and by Trigger.dev workers — never rely on module init in workers.
 */
export const buildCutsRunDeps = (
  prisma: PrismaClient,
  storage: StorageService,
  env: CutsRunDepsEnv,
): CutsRunDeps => {
  const stub = createStubCutsRunDeps();
  const mode = readAgentExecutionMode();

  const resolveSourceFile = async ({
    sourceFileId,
    companyId,
  }: {
    sourceFileId: string;
    companyId: string;
  }): Promise<SourceFileRecord> => {
    const file = await prisma.workspaceFile.findFirst({
      where: {
        id: sourceFileId,
        OR: [{ companyId }, { personalSpaceId: companyId }],
      },
    });

    if (!file) {
      throw new Error('Source file not found in workspace');
    }

    return {
      id: file.id,
      companyId: file.companyId,
      personalSpaceId: file.personalSpaceId,
      mimeType: file.mimeType,
      storageKey: file.storageKey,
      extractedText: file.extractedText,
      name: file.name,
    };
  };

  const transcribeSource: CutsRunDeps['transcribeSource'] = async ({
    file,
    agentId,
    stepKey,
  }) => {
    const needsTimedTranscript = isVideoMimeType(file.mimeType);

    if (!needsTimedTranscript && file.extractedText?.trim()) {
      return {
        text: file.extractedText,
        segments: [{ startSec: 0, endSec: 0, text: file.extractedText }],
      };
    }

    const apiKey = env.assemblyAiApiKey;
    if (!apiKey) {
      if (mode === 'inline-stub') {
        return stub.transcribeSource({ file });
      }
      throw new Error(
        'ASSEMBLYAI_API_KEY is required to transcribe video sources for the cuts agent',
      );
    }

    const speechModelId =
      agentId && stepKey
        ? await resolveStepSpeechModel(prisma, { agentId, stepKey })
        : undefined;

    const audioUrl = await storage.getPresignedDownloadUrl(file.storageKey);
    const result = await transcribeWithAssemblyAi({
      audioUrl,
      apiKey,
      baseUrl: env.assemblyAiBaseUrl,
      speechModels: speechModelId ? [speechModelId] : undefined,
      languageCode: 'pt',
    });

    if (result.utterances.length === 0) {
      if (!result.text.trim()) {
        throw new Error(
          'Video transcription detected no speech — cannot rank cuts without audio content',
        );
      }

      throw new Error(
        'Video transcription returned no timed segments — cannot rank cuts without timestamps',
      );
    }

    await prisma.workspaceFile.update({
      where: { id: file.id },
      data: {
        extractedText: result.text,
        status: 'INDEXED',
      },
    });

    return {
      text: result.text,
      segments: result.utterances.map((utterance) => ({
        startSec: utterance.start / 1000,
        endSec: utterance.end / 1000,
        text: utterance.text,
      })),
    };
  };

  return {
    resolveSourceFile,
    transcribeSource,
    renderCutClips: (params) => renderCutClipsWithDeps(prisma, storage, params),
    deleteSourceFile: async ({ sourceFileId, companyId }) => {
      const file = await prisma.workspaceFile.findFirst({
        where: {
          id: sourceFileId,
          OR: [{ companyId }, { personalSpaceId: companyId }],
        },
      });
      if (!file) return;

      await storage.deleteObject(file.storageKey);
      await prisma.workspaceFile.delete({ where: { id: file.id } });
    },
  };
};

/** Convenience for Trigger.dev tasks that read env directly. */
export const buildCutsRunDepsFromEnv = (
  prisma: PrismaClient,
  storage: StorageService,
): CutsRunDeps =>
  buildCutsRunDeps(prisma, storage, {
    assemblyAiApiKey: process.env.ASSEMBLYAI_API_KEY,
    assemblyAiBaseUrl: process.env.ASSEMBLYAI_BASE_URL,
  });
