const MESSAGE_SEQUENCE_PATTERN = /:m(\d+)$/;

/** Parses the numeric suffix from agent message ids (`runId:m0`, `runId:m12`, …). */
export const parseAgentMessageSequence = (messageId: string): number | null => {
  const match = MESSAGE_SEQUENCE_PATTERN.exec(messageId);
  return match ? Number(match[1]) : null;
};

/** Sorts agent message ids chronologically (m2 before m10). */
export const compareAgentMessageIds = (a: string, b: string): number => {
  const seqA = parseAgentMessageSequence(a);
  const seqB = parseAgentMessageSequence(b);

  if (seqA !== null && seqB !== null) {
    return seqA - seqB;
  }
  if (seqA !== null) return -1;
  if (seqB !== null) return 1;
  return a.localeCompare(b);
};

/** Returns the next free message counter for a run thread. */
export const nextAgentMessageIndex = (messageIds: Iterable<string>): number => {
  let max = -1;
  for (const messageId of messageIds) {
    const seq = parseAgentMessageSequence(messageId);
    if (seq !== null) {
      max = Math.max(max, seq);
    }
  }
  return max + 1;
};
