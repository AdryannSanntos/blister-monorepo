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
