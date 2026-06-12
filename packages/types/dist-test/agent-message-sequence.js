"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextAgentMessageIndex = exports.compareAgentMessageIds = exports.parseAgentMessageSequence = void 0;
const MESSAGE_SEQUENCE_PATTERN = /:m(\d+)$/;
/** Parses the numeric suffix from agent message ids (`runId:m0`, `runId:m12`, …). */
const parseAgentMessageSequence = (messageId) => {
    const match = MESSAGE_SEQUENCE_PATTERN.exec(messageId);
    return match ? Number(match[1]) : null;
};
exports.parseAgentMessageSequence = parseAgentMessageSequence;
/** Sorts agent message ids chronologically (m2 before m10). */
const compareAgentMessageIds = (a, b) => {
    const seqA = (0, exports.parseAgentMessageSequence)(a);
    const seqB = (0, exports.parseAgentMessageSequence)(b);
    if (seqA !== null && seqB !== null) {
        return seqA - seqB;
    }
    if (seqA !== null)
        return -1;
    if (seqB !== null)
        return 1;
    return a.localeCompare(b);
};
exports.compareAgentMessageIds = compareAgentMessageIds;
/** Returns the next free message counter for a run thread. */
const nextAgentMessageIndex = (messageIds) => {
    let max = -1;
    for (const messageId of messageIds) {
        const seq = (0, exports.parseAgentMessageSequence)(messageId);
        if (seq !== null) {
            max = Math.max(max, seq);
        }
    }
    return max + 1;
};
exports.nextAgentMessageIndex = nextAgentMessageIndex;
