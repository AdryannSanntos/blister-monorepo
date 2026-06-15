"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const cuts_1 = require("./cuts");
(0, node_test_1.describe)('cutsAgentSettingsSchema', () => {
    (0, node_test_1.it)('applies defaults', () => {
        const parsed = cuts_1.cutsAgentSettingsSchema.parse({});
        strict_1.default.equal(parsed.maxCuts, 5);
        strict_1.default.equal(parsed.cutDurationSec, 60);
        strict_1.default.equal(parsed.deleteSourceAfterRun, false);
        strict_1.default.equal(parsed.addCaptions, false);
        strict_1.default.equal(parsed.autoAcceptResults, true);
    });
    (0, node_test_1.it)('requires captionStyleId when addCaptions is true', () => {
        const result = cuts_1.cutsAgentSettingsSchema.safeParse({
            addCaptions: true,
        });
        strict_1.default.equal(result.success, false);
    });
    (0, node_test_1.it)('accepts captionStyleId when addCaptions is true', () => {
        const parsed = cuts_1.cutsAgentSettingsSchema.parse({
            addCaptions: true,
            captionStyleId: 'cs-bold',
        });
        strict_1.default.equal(parsed.captionStyleId, 'cs-bold');
    });
    (0, node_test_1.it)('rejects maxCuts above limit', () => {
        const result = cuts_1.cutsAgentSettingsSchema.safeParse({ maxCuts: 25 });
        strict_1.default.equal(result.success, false);
    });
});
(0, node_test_1.describe)('cutsRunInputSchema', () => {
    (0, node_test_1.it)('requires sourceFileId and settings snapshot', () => {
        const parsed = cuts_1.cutsRunInputSchema.parse({
            userInput: 'Generate cuts from my podcast',
            sourceFileId: 'file-123',
            settings: {},
        });
        strict_1.default.equal(parsed.sourceFileId, 'file-123');
        strict_1.default.equal(parsed.settings.maxCuts, 5);
    });
});
(0, node_test_1.describe)('cutOutputSchema', () => {
    (0, node_test_1.it)('validates viralScore 0-100 and reviewStatus', () => {
        const parsed = cuts_1.cutOutputSchema.parse({
            id: 'cut-1',
            title: 'Hook',
            description: 'Strong opening',
            startSec: 10,
            endSec: 70,
            durationSec: 60,
            viralScore: 92,
            reviewStatus: 'pending',
        });
        strict_1.default.equal(parsed.viralScore, 92);
        strict_1.default.equal(parsed.reviewStatus, 'pending');
    });
    (0, node_test_1.it)('accepts optional cutFileId for rendered clips', () => {
        const parsed = cuts_1.cutOutputSchema.parse({
            id: 'cut-1',
            title: 'Hook',
            description: 'Strong opening',
            startSec: 10,
            endSec: 70,
            durationSec: 60,
            viralScore: 92,
            reviewStatus: 'pending',
            cutFileId: 'file-cut-1',
        });
        strict_1.default.equal(parsed.cutFileId, 'file-cut-1');
    });
    (0, node_test_1.it)('rejects viralScore above 100', () => {
        const result = cuts_1.cutOutputSchema.safeParse({
            id: 'cut-1',
            title: 'Hook',
            description: 'Strong opening',
            startSec: 10,
            endSec: 70,
            durationSec: 60,
            viralScore: 101,
            reviewStatus: 'pending',
        });
        strict_1.default.equal(result.success, false);
    });
});
(0, node_test_1.describe)('cutsRunOutputSchema', () => {
    (0, node_test_1.it)('requires at least one cut', () => {
        const result = cuts_1.cutsRunOutputSchema.safeParse({
            cuts: [],
            sourceFileId: 'file-1',
        });
        strict_1.default.equal(result.success, false);
    });
});
(0, node_test_1.describe)('reviewCutsSchema', () => {
    (0, node_test_1.it)('validates cut decisions', () => {
        const parsed = cuts_1.reviewCutsSchema.parse({
            cutDecisions: [
                { cutId: 'cut-1', decision: 'approve' },
                { cutId: 'cut-2', decision: 'reject' },
            ],
        });
        strict_1.default.equal(parsed.cutDecisions.length, 2);
    });
    (0, node_test_1.it)('rejects empty decisions', () => {
        const result = cuts_1.reviewCutsSchema.safeParse({ cutDecisions: [] });
        strict_1.default.equal(result.success, false);
    });
});
