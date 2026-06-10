"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageGenerationStep = void 0;
const createImageGenerationStep = (options) => {
    const promptStepKey = options.promptStepKey ?? 'generate_prompt';
    const promptField = options.promptField ?? 'imagePrompt';
    return async (context, deps) => {
        if (!deps.imageProvider) {
            return {
                type: 'FAILED',
                error: 'Image provider is required for image_generation steps',
            };
        }
        const promptStepOutput = context.previousStepsOutput[promptStepKey];
        const promptFromStep = promptStepOutput && typeof promptStepOutput[promptField] === 'string'
            ? String(promptStepOutput[promptField])
            : '';
        const prompt = promptFromStep || String(context.inputPayload.userInput ?? '');
        if (!prompt) {
            return {
                type: 'FAILED',
                error: 'Image prompt is required for image generation',
            };
        }
        const result = await deps.imageProvider.generate({
            prompt,
            agentId: context.agentId,
        });
        return {
            type: 'CONTINUE',
            output: {
                imageUrl: result.imageUrl ?? result.base64,
                storageKey: result.storageKey,
                prompt,
                style: promptStepOutput?.style,
                colors: promptStepOutput?.colors,
            },
        };
    };
};
exports.createImageGenerationStep = createImageGenerationStep;
