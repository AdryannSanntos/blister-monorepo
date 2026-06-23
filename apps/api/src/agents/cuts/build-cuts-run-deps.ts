import {
  type AgentIaSdk,
  TRANSCRIPTION_MAX_WAIT_MS,
  createAgentIaSdk,
  resolveStepSpeechModel,
} from '@company-os/agent-ia-sdk';
import type { PrismaClient } from '@company-os/db';
import type { TextStyleSpec } from '@company-os/types';
import { textStyleSpecSchema } from '@company-os/types';
import { ConfigService } from '@nestjs/config';
import { loadProviderSecrets } from '../../integrations/agent-ia-sdk/load-provider-secrets';
import { ensureCutRunFolder } from '../../media/cut-run-folder.util';
import type { StorageService } from '../../storage/storage.service';
import {
  createCutsDevTimer,
  errorCutsDev,
  logCutsDev,
  summarizeTranscript,
} from './cuts-dev-logger';
import type { CutsRunDeps, SourceFileRecord } from './ports/cuts-run-deps';
import {
  resolveRunStartedAt,
  resolveScope,
  resolveStorageRoot,
} from './services/cuts-render-helpers';
import { createProductionRankSegmentsExecutor } from './steps/rank-segments.step';

const isVideoMimeType = (mimeType: string): boolean => mimeType.startsWith('video/');

const PRESIGNED_URL_TIMEOUT_MS = 60 * 1000;
const TRANSCRIPTION_TIMEOUT_MS = TRANSCRIPTION_MAX_WAIT_MS;

async function raceWithTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/**
 * Builds production cuts dependencies (DB file lookup, transcription via the
 * SDK, Trigger render dispatch). Used by Trigger.dev workers only.
 */
export const buildCutsRunDeps = (
  prisma: PrismaClient,
  storage: StorageService,
  sdk: AgentIaSdk,
): CutsRunDeps => {
  const resolveSourceFile = async ({
    sourceFileId,
    companyId,
  }: {
    sourceFileId: string;
    companyId: string;
  }): Promise<SourceFileRecord> => {
    logCutsDev('deps', 'Resolving source file', { sourceFileId, companyId });

    const file = await prisma.workspaceFile.findFirst({
      where: {
        id: sourceFileId,
        OR: [{ companyId }, { personalSpaceId: companyId }],
      },
    });

    if (!file) {
      errorCutsDev('deps', 'Source file not found', undefined, { sourceFileId, companyId });
      throw new Error('Source file not found in workspace');
    }

    logCutsDev('deps', 'Source file found', {
      sourceFileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType,
      hasExtractedText: Boolean(file.extractedText?.trim()),
    });

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

  const transcribeSource: CutsRunDeps['transcribeSource'] = async ({ file, agentId, stepKey }) => {
    const elapsed = createCutsDevTimer();
    const needsTimedTranscript = isVideoMimeType(file.mimeType);

    logCutsDev('deps', 'Transcription requested', {
      fileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType,
      needsTimedTranscript,
      agentId,
      stepKey,
    });

    if (!needsTimedTranscript && file.extractedText?.trim()) {
      logCutsDev('deps', 'Using cached extracted text (non-video)', {
        fileId: file.id,
        textChars: file.extractedText.length,
        elapsedMs: elapsed(),
      });
      return {
        text: file.extractedText,
        segments: [{ startSec: 0, endSec: 0, text: file.extractedText }],
      };
    }

    const transcription = sdk.ia.transcription();

    try {
      const speechModelId =
        agentId && stepKey ? await resolveStepSpeechModel(prisma, { agentId, stepKey }) : undefined;

      logCutsDev('deps', 'Generating presigned URL for transcription', {
        fileId: file.id,
        storageKey: file.storageKey,
        speechModelId,
      });

      const audioUrl = await raceWithTimeout(
        storage.getPresignedDownloadUrl(file.storageKey),
        PRESIGNED_URL_TIMEOUT_MS,
        'Presigned download URL generation timed out',
      );

      logCutsDev('deps', 'Starting STT transcription', {
        fileId: file.id,
        speechModelId,
      });

      const result = await raceWithTimeout(
        transcription.transcribe({
          audioUrl,
          language: 'pt',
          speechModels: speechModelId ? [speechModelId] : undefined,
        }),
        TRANSCRIPTION_TIMEOUT_MS,
        'Transcription timed out',
      );

      logCutsDev('deps', 'STT transcription raw result', {
        fileId: file.id,
        segmentCount: result.segments.length,
        textChars: result.text.length,
        elapsedMs: elapsed(),
      });

      if (result.segments.length === 0) {
        if (!result.text.trim()) {
          errorCutsDev('deps', 'No speech detected in video', undefined, {
            fileId: file.id,
            elapsedMs: elapsed(),
          });
          throw new Error(
            'Video transcription detected no speech — cannot rank cuts without audio content',
          );
        }

        errorCutsDev('deps', 'No timed segments in transcription', undefined, {
          fileId: file.id,
          textChars: result.text.length,
          elapsedMs: elapsed(),
        });
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

      const segments = result.segments.map((segment) => ({
        startSec: segment.start / 1000,
        endSec: segment.end / 1000,
        text: segment.text,
        speaker: segment.speaker,
        words: segment.words?.map((word) => ({
          text: word.text,
          startSec: word.start / 1000,
          endSec: word.end / 1000,
        })),
      }));

      logCutsDev('deps', 'Transcription completed and cached', {
        fileId: file.id,
        ...summarizeTranscript(segments, result.text),
        elapsedMs: elapsed(),
      });

      return {
        text: result.text,
        segments,
      };
    } catch (error) {
      errorCutsDev('deps', 'transcribeSource failed', error, {
        fileId: file.id,
        agentId,
        stepKey,
        elapsedMs: elapsed(),
      });
      throw error;
    }
  };

  const ensureRunFolder: CutsRunDeps['ensureRunFolder'] = async ({ runId, sourceFile }) => {
    logCutsDev('deps', 'Ensuring run folder', {
      runId,
      sourceFileName: sourceFile.name,
    });

    const scope = resolveScope(sourceFile.companyId, sourceFile.personalSpaceId);
    const storageRoot = await resolveStorageRoot(
      prisma,
      sourceFile.companyId,
      sourceFile.personalSpaceId,
    );
    const runStartedAt = await resolveRunStartedAt(prisma, runId);
    const runFolderId = await ensureCutRunFolder(prisma, storage, {
      scope,
      storageRoot,
      runId,
      sourceFileName: sourceFile.name,
      runStartedAt,
    });

    logCutsDev('deps', 'Run folder ensured', {
      runId,
      runFolderId,
      scope: 'companyId' in scope ? 'company' : 'personal',
    });

    return runFolderId;
  };

  const resolveTextStyleSpec = async (
    styleId: string | undefined,
  ): Promise<TextStyleSpec | null> => {
    if (!styleId) return null;
    const item = await prisma.marketplaceItem.findFirst({
      where: { OR: [{ id: styleId }, { slug: styleId }] },
      select: { specs: true },
    });
    if (!item?.specs) return null;
    const parsed = textStyleSpecSchema.safeParse(item.specs);
    return parsed.success ? parsed.data : null;
  };

  const dispatchRenderJobs: CutsRunDeps['dispatchRenderJobs'] = async ({
    runId,
    runFolderId,
    cuts,
    sourceFile,
    overlay,
  }) => {
    const elapsed = createCutsDevTimer();
    const { cutsRenderClip } = await import('../../../trigger/cuts-render-clip');

    const titleStyleSpec = overlay?.addTitle
      ? await resolveTextStyleSpec(overlay.titleStyleId)
      : null;
    const captionStyleSpec = overlay?.addCaptions
      ? await resolveTextStyleSpec(overlay.captionStyleId)
      : null;

    const payloads = cuts.map((cut, index) => ({
      payload: {
        runId,
        runFolderId,
        cutId: cut.id,
        cutIndex: index + 1,
        title: cut.title,
        sourceStorageKey: sourceFile.storageKey,
        startSec: cut.startSec,
        endSec: cut.endSec,
        companyId: sourceFile.companyId,
        personalSpaceId: sourceFile.personalSpaceId,
        addTitle: overlay?.addTitle ?? false,
        titleText: cut.title,
        titleStyleSpec,
        titlePosition: overlay?.titlePosition ?? { x: 0.5, y: 0.08 },
        titleDurationSec: overlay?.titleDurationSec ?? 5,
        addCaptions: overlay?.addCaptions ?? false,
        captionStyleSpec,
        captionPosition: overlay?.captionPosition ?? { x: 0.5, y: 0.85 },
        captions: overlay?.captionsByCutId[cut.id] ?? [],
      },
    }));

    logCutsDev('deps', 'Batch triggering render clips', {
      runId,
      runFolderId,
      jobCount: payloads.length,
      cuts: payloads.map((item) => ({
        cutId: item.payload.cutId,
        cutIndex: item.payload.cutIndex,
        title: item.payload.title,
        startSec: item.payload.startSec,
        endSec: item.payload.endSec,
      })),
    });

    await cutsRenderClip.batchTrigger(payloads);

    logCutsDev('deps', 'Render clip batch triggered', {
      runId,
      jobCount: payloads.length,
      elapsedMs: elapsed(),
    });
  };

  return {
    resolveSourceFile,
    transcribeSource,
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
    ensureRunFolder,
    dispatchRenderJobs,
    completeRankSegments: createProductionRankSegmentsExecutor(prisma, sdk),
  };
};

/** Convenience for Trigger.dev tasks: builds the SDK from env, then cuts deps. */
export const buildCutsRunDepsFromEnv = (
  prisma: PrismaClient,
  storage: StorageService,
): CutsRunDeps =>
  buildCutsRunDeps(
    prisma,
    storage,
    createAgentIaSdk({ prisma, secrets: loadProviderSecrets(new ConfigService()) }),
  );
