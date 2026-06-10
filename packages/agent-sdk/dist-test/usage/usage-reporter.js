"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCollectingUsageReporter = exports.createNoOpUsageReporter = void 0;
/** Usage reporter that does nothing — safe default when none is injected. */
const createNoOpUsageReporter = () => ({
    reportUsage: async () => { },
});
exports.createNoOpUsageReporter = createNoOpUsageReporter;
/** Usage reporter that collects events in memory — used by tests/harness. */
const createCollectingUsageReporter = () => {
    const events = [];
    return {
        events,
        reportUsage: async (event) => {
            events.push(event);
        },
    };
};
exports.createCollectingUsageReporter = createCollectingUsageReporter;
