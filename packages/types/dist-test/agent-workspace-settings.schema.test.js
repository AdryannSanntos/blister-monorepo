"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const carousel_1 = require("./agents/carousel");
const blister_os_1 = require("./blister-os");
(0, node_test_1.describe)('agent workspace settings schemas', () => {
    (0, node_test_1.it)('does not strip carousel fields when parsing API responses', () => {
        const payload = {
            agentId: 'carousel',
            config: {
                slidesCount: 7,
                brandName: 'Creator Lab',
                instagramHandle: 'creatorlab',
                accentColor: '#112233',
                defaultSocialNetworks: ['instagram'],
                aiGeneratedImages: true,
                metaRightMode: 'date',
            },
        };
        const parsed = blister_os_1.agentWorkspaceSettingsResponseSchema.parse(payload);
        const settings = carousel_1.carouselAgentSettingsSchema.parse(parsed.config);
        strict_1.default.equal(settings.brandName, 'Creator Lab');
        strict_1.default.equal(settings.slidesCount, 7);
        strict_1.default.equal(settings.accentColor, '#112233');
        strict_1.default.equal(settings.metaRightMode, 'date');
    });
    (0, node_test_1.it)('does not coerce carousel PATCH payloads into cuts settings', () => {
        const body = {
            config: {
                slidesCount: 6,
                brandName: 'Marca X',
                accentColor: '#AABBCC',
                defaultSocialNetworks: ['instagram'],
                aiGeneratedImages: false,
                metaRightMode: 'handle',
            },
        };
        const parsed = blister_os_1.updateAgentWorkspaceSettingsSchema.parse(body);
        const settings = carousel_1.carouselAgentSettingsSchema.parse(parsed.config);
        strict_1.default.equal(settings.brandName, 'Marca X');
        strict_1.default.equal(settings.accentColor, '#AABBCC');
        strict_1.default.equal(settings.slidesCount, 6);
    });
});
