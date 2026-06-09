import { useEffect, useMemo, useState } from "react";
import { cn } from "../utils/cn";

export type QuestionOption = {
  id: string;
  label: string;
  description?: string;
};

export type QuestionConfig = {
  kind: "single" | "multi" | "text";
  title: string;
  description?: string;
  options?: QuestionOption[];
  allowCustom?: boolean;
  customLabel?: string;
  customPlaceholder?: string;
  minSelections?: number;
  maxSelections?: number;
  placeholder?: string;
};

export type QuestionAnswer = {
  kind: "single" | "multi" | "text" | "skip";
  selectedIds?: string[];
  text?: string;
};

const QUESTION_CUSTOM_ID = "__custom__";

function optionBadge(idx: number) {
  return String.fromCharCode(65 + idx);
}

export type QuestionPromptProps = {
  questions: QuestionConfig[];
  questionIndex?: number;
  totalQuestions?: number;
  onPreviousQuestion?: () => void;
  onNextQuestion?: () => void;
  initialAnswer?: QuestionAnswer;
  /** Label for the primary action on the LAST question (default "Send"). */
  submitLabel?: string;
  /** Label for the primary action when there are more questions ahead
   *  (default "Next"). The host (e.g. QuestionTool) is expected to advance
   *  to the next question after onSubmit fires. */
  nextLabel?: string;
  skipLabel?: string;
  allowSkip?: boolean;
  /** Label for the cancel action (default "Cancelar"). */
  cancelLabel?: string;
  onSubmit: (answer: QuestionAnswer) => void;
  onSkip?: () => void;
  /** When provided, renders a Cancel action that dismisses the form. */
  onCancel?: () => void;
  className?: string;
  /** `embedded` drops the outer card chrome — for use inside the chat stream. */
  variant?: "card" | "embedded";
};

export function QuestionPrompt({
  questions,
  questionIndex = 1,
  totalQuestions,
  onPreviousQuestion,
  onNextQuestion,
  submitLabel = "Send",
  nextLabel = "Next",
  skipLabel = "Skip",
  allowSkip = true,
  cancelLabel = "Cancelar",
  initialAnswer,
  onSubmit,
  onSkip,
  onCancel,
  className,
  variant = "card",
}: QuestionPromptProps) {
  const isEmbedded = variant === "embedded";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [textValue, setTextValue] = useState("");
  const resolvedTotal = totalQuestions ?? questions.length;
  const clampedIndex = Math.max(1, Math.min(questionIndex, resolvedTotal));
  const activeQuestion = questions[clampedIndex - 1];
  const customEnabled = activeQuestion?.allowCustom ?? false;
  const showNav =
    resolvedTotal > 1 && (!!onPreviousQuestion || !!onNextQuestion);
  const canGoPrev = clampedIndex > 1;
  const canGoNext = clampedIndex < resolvedTotal;
  const isLastQuestion = clampedIndex >= resolvedTotal;
  const primaryLabel = isLastQuestion ? submitLabel : nextLabel;

  useEffect(() => {
    if (!initialAnswer || initialAnswer.kind === "skip") {
      setSelectedIds([]);
      setCustomText("");
      setTextValue("");
      return;
    }

    if (activeQuestion?.kind === "text") {
      setSelectedIds([]);
      setCustomText("");
      setTextValue(initialAnswer.text ?? "");
      return;
    }

    const nextSelected = new Set(initialAnswer.selectedIds ?? []);
    const nextCustomText = initialAnswer.text ?? "";
    if (customEnabled && nextCustomText.trim().length > 0) {
      nextSelected.add(QUESTION_CUSTOM_ID);
    }
    setSelectedIds(Array.from(nextSelected));
    setCustomText(nextCustomText);
    setTextValue("");
  }, [
    activeQuestion?.kind,
    clampedIndex,
    customEnabled,
    initialAnswer?.kind,
    initialAnswer?.text,
    initialAnswer?.selectedIds?.join("|"),
  ]);

  const canSubmit = useMemo(() => {
    if (activeQuestion?.kind === "text") return textValue.trim().length > 0;

    const selectedNonCustom = selectedIds.filter(
      (id) => id !== QUESTION_CUSTOM_ID,
    ).length;
    const hasCustomText = customText.trim().length > 0;
    const total = selectedNonCustom + (hasCustomText ? 1 : 0);

    if (activeQuestion?.kind === "single") {
      return total === 1;
    }

    const min = activeQuestion?.minSelections ?? 1;
    const max = activeQuestion?.maxSelections;
    if (total < min) return false;
    if (typeof max === "number" && total > max) return false;
    return total > 0;
  }, [
    activeQuestion?.kind,
    activeQuestion?.minSelections,
    activeQuestion?.maxSelections,
    selectedIds,
    customText,
    textValue,
  ]);

  const toggleMulti = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSingleSelect = (id: string) => {
    setSelectedIds([id]);
  };

  const handleCustomTextChange = (nextValue: string) => {
    setCustomText(nextValue);
    if (!activeQuestion) return;
    if (activeQuestion.kind === "single") {
      setSelectedIds(nextValue.trim().length > 0 ? [QUESTION_CUSTOM_ID] : []);
      return;
    }
    setSelectedIds((prev) => {
      const hasCustom = prev.includes(QUESTION_CUSTOM_ID);
      if (nextValue.trim().length > 0 && !hasCustom) {
        return [...prev, QUESTION_CUSTOM_ID];
      }
      if (nextValue.trim().length === 0 && hasCustom) {
        return prev.filter((id) => id !== QUESTION_CUSTOM_ID);
      }
      return prev;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit || !activeQuestion) return;
    if (activeQuestion.kind === "text") {
      onSubmit({ kind: "text", text: textValue.trim() });
      return;
    }

    const selectedNonCustom = selectedIds.filter(
      (id) => id !== QUESTION_CUSTOM_ID,
    );
    const answerText = customText.trim() || undefined;
    onSubmit({
      kind: activeQuestion.kind,
      selectedIds: selectedNonCustom,
      text: answerText || undefined,
    });
  };

  const handleSkip = () => {
    onSkip?.();
    onSubmit({ kind: "skip" });
  };

  if (!activeQuestion) return null;

  const fieldClass =
    "w-full rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--bg-sunken)] px-3 text-[13.5px] text-[var(--fg-primary)] placeholder:text-[var(--fg-quaternary)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--dur-fast)] focus:border-[var(--accent)] focus:bg-[var(--bg-base)] focus:ring-[3px] focus:ring-[var(--accent-soft)]";

  const badgeClass = (active: boolean) =>
    cn(
      "inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--r-sm)] border px-1 text-xs font-semibold transition-colors duration-[var(--dur-fast)]",
      active
        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--fg-on-accent,#fff)]"
        : "border-[var(--line-default)] bg-transparent text-[var(--fg-tertiary)]",
    );

  return (
    <div
      className={cn(
        "space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-[var(--dur-base)]",
        isEmbedded
          ? "py-1"
          : "rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-base)] p-3",
        className,
      )}
    >
      <div
        className="flex items-center gap-2"
        data-total-questions={resolvedTotal}
      >
        {resolvedTotal > 1 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent-soft)] px-1 text-xs font-semibold text-[var(--accent)]">
            {clampedIndex}
          </span>
        ) : null}
        <span className="text-sm font-medium text-[var(--fg-primary)]">
          {activeQuestion.title}
        </span>
      </div>

      {activeQuestion.description ? (
        <p className="text-[12.5px] leading-snug text-[var(--fg-tertiary)]">
          {activeQuestion.description}
        </p>
      ) : null}

      {activeQuestion.kind !== "text" &&
        (activeQuestion.options?.length ?? 0) > 0 && (
          <div className="space-y-1">
            {activeQuestion.options!.map((option, idx) => {
              const checked = selectedIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    if (activeQuestion.kind === "single") {
                      handleSingleSelect(option.id);
                      if (customEnabled) setCustomText("");
                    } else {
                      toggleMulti(option.id);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[var(--r-md)] border px-2.5 py-2 text-left transition-colors duration-[var(--dur-fast)]",
                    checked
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-transparent hover:bg-[var(--bg-hover)]",
                  )}
                >
                  <span className={badgeClass(checked)}>
                    {optionBadge(idx)}
                  </span>
                  <span className="text-sm text-[var(--fg-secondary)]">
                    {option.label}
                    {option.description && (
                      <span className="text-[var(--fg-quaternary)]">
                        {" "}
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

            {customEnabled && (
              <div className="flex items-center gap-2 pt-1">
                <span className={badgeClass(selectedIds.includes(QUESTION_CUSTOM_ID))}>
                  {optionBadge(activeQuestion.options!.length)}
                </span>
                <input
                  value={customText}
                  onChange={(event) =>
                    handleCustomTextChange(event.target.value)
                  }
                  placeholder={
                    activeQuestion.customPlaceholder ?? "Digite sua resposta"
                  }
                  className={cn(fieldClass, "h-[var(--field-h-md,34px)]")}
                />
              </div>
            )}
          </div>
        )}

      {activeQuestion.kind === "text" && (
        <textarea
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          placeholder={activeQuestion.placeholder ?? "Digite sua resposta"}
          rows={3}
          className={cn(
            fieldClass,
            "max-h-[200px] min-h-[80px] resize-y overflow-y-auto py-2 leading-relaxed",
          )}
        />
      )}

      <div
        className={cn(
          "flex items-center gap-1.5",
          showNav ? "justify-between" : "justify-end",
        )}
      >
        {showNav && (
          <div className="flex items-center gap-1">
            {onPreviousQuestion && (
              <button
                type="button"
                onClick={onPreviousQuestion}
                disabled={!canGoPrev}
                className="h-8 rounded-[var(--r-md)] px-2.5 text-[13px] font-medium text-[var(--fg-tertiary)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--fg-secondary)] disabled:opacity-50"
              >
                Anterior
              </button>
            )}
            {onNextQuestion && (
              <button
                type="button"
                onClick={onNextQuestion}
                disabled={!canGoNext}
                className="h-8 rounded-[var(--r-md)] px-2.5 text-[13px] font-medium text-[var(--fg-tertiary)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--fg-secondary)] disabled:opacity-50"
              >
                Próxima
              </button>
            )}
          </div>
        )}
        <div className="flex items-center justify-end gap-1.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-8 rounded-[var(--r-md)] px-3 text-[13px] font-medium text-[var(--fg-tertiary)] transition-[background-color,color,transform] duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-secondary)] active:translate-y-px"
            >
              {cancelLabel}
            </button>
          )}
          {allowSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="h-8 rounded-[var(--r-md)] px-3 text-[13px] font-medium text-[var(--fg-tertiary)] transition-[background-color,color,transform] duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-secondary)] active:translate-y-px"
            >
              {skipLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-8 rounded-[var(--r-md)] bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--fg-on-accent,#fff)] transition-[background-color,opacity,transform] duration-[var(--dur-fast)] hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
