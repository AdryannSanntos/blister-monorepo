import { memo } from "react";
import { useToolComplete } from "../hooks/use-tool-complete";
import type { StepState, TimelineStep } from "../types/timeline";
import {
  mapToolInvocationToStep,
  mapToolStateToStepState,
} from "../utils/tool-adapters";
import { ToolRowBase } from "./tool-row-base";

export type ThinkingCollapsedProps = {
  step: Extract<TimelineStep, { type: "tool-call" }>;
  state: StepState;
  onComplete: () => void;
  defaultOpen?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
};

export function ThinkingCollapsed({
  step,
  state,
  onComplete,
  defaultOpen,
  expanded,
  onToggleExpand,
}: ThinkingCollapsedProps) {
  const isRunning = state === "animating";

  useToolComplete(isRunning, step.duration, onComplete);

  const statusLabel = step.thoughtContent?.split("\n")[0]?.trim();
  const previewBody = step.thoughtContent?.includes("\n")
    ? step.thoughtContent.split("\n").slice(1).join("\n").trim()
    : "";
  const hasExpandableBody = Boolean(previewBody || (isRunning && step.thoughtContent));

  return (
    <ToolRowBase
      shimmerLabel={statusLabel || "Thinking"}
      completeLabel={statusLabel || "Thought"}
      isAnimating={isRunning}
      expandable={hasExpandableBody}
      defaultOpen={defaultOpen}
      expanded={isRunning ? true : expanded}
      onToggleExpand={isRunning ? undefined : onToggleExpand}
    >
      <div className="max-h-[175px] overflow-y-auto">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {previewBody || step.thoughtContent}
        </p>
      </div>
    </ToolRowBase>
  );
}

export type ThinkingToolProps = {
  part?: any;
  step?: Extract<TimelineStep, { type: "tool-call" }>;
  state?: StepState;
  onComplete?: () => void;
  defaultOpen?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
};

export const ThinkingTool = memo(function ThinkingTool({
  part,
  step: externalStep,
  state: externalState,
  onComplete: externalOnComplete,
  defaultOpen,
  expanded,
  onToggleExpand,
}: ThinkingToolProps) {
  let step: Extract<TimelineStep, { type: "tool-call" }>;
  let stepState: StepState;
  let onComplete: () => void;

  if (externalStep && externalState && externalOnComplete) {
    step = externalStep;
    stepState = externalState;
    onComplete = externalOnComplete;
  } else if (part) {
    step = mapToolInvocationToStep(part.toolCallId ?? part.id ?? "thinking", {
      toolName: "Thinking",
      args: part.input ?? part.args ?? {},
      state:
        part.state === "output-available"
          ? "result"
          : part.state === "input-streaming"
            ? "partial-call"
            : "call",
      result: part.output ?? part.result,
    });
    stepState = mapToolStateToStepState(
      part.state === "output-available"
        ? "result"
        : part.state === "input-streaming"
          ? "partial-call"
          : "call",
    );
    onComplete = () => {};
  } else {
    return null;
  }

  return (
    <ThinkingCollapsed
      step={step}
      state={stepState}
      onComplete={onComplete}
      defaultOpen={defaultOpen}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
    />
  );
});
