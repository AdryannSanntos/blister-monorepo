"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allRequiredSlotsFilled = exports.countFilledRequiredSlots = exports.countRequiredSlots = exports.slideRequiresUploads = exports.parseImageUploadKey = exports.buildImageUploadKey = void 0;
const buildImageUploadKey = (slideId, slotKey) => `${slideId}:${slotKey}`;
exports.buildImageUploadKey = buildImageUploadKey;
const parseImageUploadKey = (key) => {
    const sep = key.indexOf(":");
    return { slideId: key.slice(0, sep), slotKey: key.slice(sep + 1) };
};
exports.parseImageUploadKey = parseImageUploadKey;
const slideRequiresUploads = (slide) => slide.imageSlots.some((slot) => slot.required);
exports.slideRequiresUploads = slideRequiresUploads;
const countRequiredSlots = (plan) => plan.slides.reduce((count, slide) => count + slide.imageSlots.filter((slot) => slot.required).length, 0);
exports.countRequiredSlots = countRequiredSlots;
const countFilledRequiredSlots = (plan, imageUploads) => plan.slides.reduce((count, slide) => {
    for (const slot of slide.imageSlots) {
        if (!slot.required)
            continue;
        const key = (0, exports.buildImageUploadKey)(slide.id, slot.slotKey);
        if (imageUploads[key]?.trim())
            count += 1;
    }
    return count;
}, 0);
exports.countFilledRequiredSlots = countFilledRequiredSlots;
const allRequiredSlotsFilled = (plan, imageUploads) => (0, exports.countFilledRequiredSlots)(plan, imageUploads) === (0, exports.countRequiredSlots)(plan);
exports.allRequiredSlotsFilled = allRequiredSlotsFilled;
