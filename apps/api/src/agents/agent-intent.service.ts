import { Injectable } from '@nestjs/common';

const FINAL_ARTIFACT_PATTERNS = [
  /\b(pdf|png|ppt|powerpoint|docx?|xlsx?|csv)\b/i,
  /\b(arquivo|artefato|entrega|versao|versão) final\b/i,
  /\bexporta(r| isso)?\b/i,
  /\bgera(r)? (um|uma)?\s*(pdf|png|arquivo|artefato|entrega)\b/i,
];

export type AgentIntentDecision = {
  mode: 'execution' | 'conversational';
  reason: 'final_artifact_requested' | 'conversation_only';
};

@Injectable()
export class AgentIntentService {
  async classify(input: { message: string }): Promise<AgentIntentDecision> {
    const normalizedMessage = input.message.trim();
    const isFinalArtifactRequest = FINAL_ARTIFACT_PATTERNS.some((pattern) =>
      pattern.test(normalizedMessage),
    );

    return {
      mode: isFinalArtifactRequest ? 'execution' : 'conversational',
      reason: isFinalArtifactRequest ? 'final_artifact_requested' : 'conversation_only',
    };
  }
}
