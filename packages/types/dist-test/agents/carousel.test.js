"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const carousel_1 = require("./carousel");
(0, node_test_1.describe)('carouselRunInputSchema', () => {
    (0, node_test_1.it)('accepts a single-slide carousel', () => {
        const parsed = carousel_1.carouselRunInputSchema.safeParse({
            theme: 'Morning habits',
            templateId: 'editorial-performance',
            socialNetworks: ['instagram'],
            slidesCount: 1,
        });
        strict_1.default.equal(parsed.success, true);
        if (parsed.success) {
            strict_1.default.equal(parsed.data.slidesCount, 1);
        }
    });
    (0, node_test_1.it)('accepts single-slide settings nested in run input', () => {
        const parsed = carousel_1.carouselRunInputSchema.safeParse({
            theme: 'Morning habits',
            templateId: 'editorial-performance',
            socialNetworks: ['instagram'],
            slidesCount: 1,
            settings: carousel_1.carouselAgentSettingsSchema.parse({ slidesCount: 1 }),
        });
        strict_1.default.equal(parsed.success, true);
    });
});
(0, node_test_1.describe)('carouselIdeaSelectionSchema', () => {
    (0, node_test_1.it)('accepts selectedIdeaId when customIdea is absent', () => {
        const parsed = carousel_1.carouselIdeaSelectionSchema.safeParse({
            selectedIdeaId: 'idea_1',
        });
        strict_1.default.equal(parsed.success, true);
        if (parsed.success) {
            strict_1.default.equal(parsed.data.selectedIdeaId, 'idea_1');
            strict_1.default.equal(parsed.data.customIdea, undefined);
        }
    });
    (0, node_test_1.it)('accepts customIdea when selectedIdeaId is absent', () => {
        const parsed = carousel_1.carouselIdeaSelectionSchema.safeParse({
            customIdea: { title: 'Minha ideia' },
        });
        strict_1.default.equal(parsed.success, true);
        if (parsed.success) {
            strict_1.default.equal(parsed.data.customIdea?.title, 'Minha ideia');
            strict_1.default.equal(parsed.data.selectedIdeaId, undefined);
        }
    });
    (0, node_test_1.it)('accepts customIdea with optional description', () => {
        const parsed = carousel_1.carouselIdeaSelectionSchema.safeParse({
            customIdea: {
                title: 'Hook sobre produtividade',
                description: 'Foco em rotina matinal de 15 minutos',
            },
        });
        strict_1.default.equal(parsed.success, true);
        if (parsed.success) {
            strict_1.default.equal(parsed.data.customIdea?.description, 'Foco em rotina matinal de 15 minutos');
        }
    });
    (0, node_test_1.it)('rejects when both selectedIdeaId and customIdea are absent', () => {
        const parsed = carousel_1.carouselIdeaSelectionSchema.safeParse({});
        strict_1.default.equal(parsed.success, false);
    });
    (0, node_test_1.it)('rejects customIdea with empty title', () => {
        const parsed = carousel_1.carouselIdeaSelectionSchema.safeParse({
            customIdea: { title: '' },
        });
        strict_1.default.equal(parsed.success, false);
    });
});
