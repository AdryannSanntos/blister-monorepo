import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { transcribeWithAssemblyAi } from '../../ai-runtime/adapters/assemblyai-stt.adapter';
import { resolveStepSpeechModel } from '../../ai-runtime/resolve-model';
import { renderCutClipsWithDeps } from '../cuts/services/render-cut-clips.service';
import {
  createStubCutsRunDeps,
  setCutsRunDeps,
  type CutsRunDeps,
  type SourceFileRecord,
} from '../cuts/ports/cuts-run-deps';

@Injectable()
export class CutsRunDepsAdapter implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    setCutsRunDeps(this.buildDeps());
  }

  private buildDeps(): CutsRunDeps {
    const stub = createStubCutsRunDeps();
    const apiKey = this.config.get<string>('ASSEMBLYAI_API_KEY');

    return {
      resolveSourceFile: async ({ sourceFileId, companyId }) => {
        const file = await this.prisma.workspaceFile.findFirst({
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
        } satisfies SourceFileRecord;
      },
      transcribeSource: async ({ file, agentId, stepKey }) => {
        if (file.extractedText) {
          return {
            text: file.extractedText,
            segments: [{ startSec: 0, endSec: 0, text: file.extractedText }],
          };
        }

        if (!apiKey) {
          return stub.transcribeSource({ file });
        }

        const speechModelId =
          agentId && stepKey
            ? await resolveStepSpeechModel(this.prisma, { agentId, stepKey })
            : undefined;

        const speechModels = speechModelId ? [speechModelId] : undefined;

        const audioUrl = await this.storage.getPresignedDownloadUrl(file.storageKey);
        const result = await transcribeWithAssemblyAi({
          audioUrl,
          apiKey,
          baseUrl: this.config.get<string>('ASSEMBLYAI_BASE_URL'),
          speechModels,
        });

        await this.prisma.workspaceFile.update({
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
      },
      renderCutClips: async (params) =>
        renderCutClipsWithDeps(this.prisma, this.storage, params),
      deleteSourceFile: async ({ sourceFileId, companyId }) => {
        const file = await this.prisma.workspaceFile.findFirst({
          where: {
            id: sourceFileId,
            OR: [{ companyId }, { personalSpaceId: companyId }],
          },
        });
        if (!file) return;

        await this.storage.deleteObject(file.storageKey);
        await this.prisma.workspaceFile.delete({ where: { id: file.id } });
      },
    };
  }
}
