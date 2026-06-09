import { useEffect, useMemo, useState } from "react";
import type { QuestionAnswer, QuestionConfig } from "./question-prompt";
import { QuestionPrompt } from "./question-prompt";

export type QuestionToolPart = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: {
    questions: QuestionConfig[];
    questionIndex?: number;
    totalQuestions?: number;
    onPreviousQuestion?: () => void;
    onNextQuestion?: () => void;
    submitLabel?: string;
    nextLabel?: string;
    skipLabel?: string;
    allowSkip?: boolean;
    onSubmitAnswer?: (answer: QuestionAnswer) => void;
  };
  output?: {
    answer?: QuestionAnswer;
  };
};

export type QuestionToolProps = {
  part: QuestionToolPart;
  chatStatus?: string;
};

function formatAnswer(answer: QuestionAnswer) {
  if (answer.kind === "skip") return "Pulado";
  if (answer.kind === "text") return answer.text || "Respondido";
  const ids = answer.selectedIds?.length ? answer.selectedIds.join(", ") : "";
  if (answer.text) return ids ? `${ids} (${answer.text})` : answer.text;
  return ids || "Respondido";
}

export function QuestionTool({ part }: QuestionToolProps) {
  const [localIndex, setLocalIndex] = useState(part.input?.questionIndex ?? 1);
  const questions: QuestionConfig[] = part.input?.questions ?? [];
  const totalQuestions = part.input?.totalQuestions ?? questions.length;
  const isControlled = typeof part.input?.questionIndex === "number";
  const questionIndex = isControlled
    ? (part.input?.questionIndex ?? 1)
    : questions.length > 0
      ? localIndex
      : (part.input?.questionIndex ?? 1);
  const clampedIndex = Math.max(1, Math.min(questionIndex, totalQuestions));
  const question = questions[clampedIndex - 1];
  const [localAnswers, setLocalAnswers] = useState<
    Record<number, QuestionAnswer>
  >({});

  useEffect(() => {
    if (typeof part.input?.questionIndex === "number") {
      setLocalIndex(part.input.questionIndex);
    }
  }, [part.input?.questionIndex]);

  useEffect(() => {
    setLocalAnswers({});
    setLocalIndex(part.input?.questionIndex ?? 1);
  }, [part.toolCallId]);

  if (!question) return null;

  const outputAnswer = part.output?.answer;
  const answeredCount = Object.keys(localAnswers).length;
  const isComplete =
    totalQuestions === 1
      ? !!outputAnswer || answeredCount >= 1
      : totalQuestions > 0 && answeredCount >= totalQuestions;

  const summaryText = useMemo(() => {
    if (!isComplete) return "";
    if (totalQuestions > 1) {
      return Array.from({ length: totalQuestions }, (_, idx) => {
        const answer = localAnswers[idx + 1];
        return answer ? formatAnswer(answer) : "Pendente";
      }).join(" · ");
    }
    if (outputAnswer) return formatAnswer(outputAnswer);
    if (localAnswers[clampedIndex]) {
      return formatAnswer(localAnswers[clampedIndex]);
    }
    return "Respondido";
  }, [
    clampedIndex,
    isComplete,
    localAnswers,
    outputAnswer,
    totalQuestions,
  ]);

  const goNext = () => {
    if (clampedIndex >= totalQuestions) return;
    part.input?.onNextQuestion?.();
    if (!isControlled) {
      setLocalIndex((prev) => Math.min(totalQuestions, prev + 1));
    }
  };

  if (isComplete) {
    return (
      <p className="text-sm text-[var(--fg-tertiary)]">
        <span className="font-medium text-[var(--fg-secondary)]">
          {question.title}
        </span>
        <span aria-hidden="true" className="mx-1.5">
          ·
        </span>
        <span>{summaryText}</span>
      </p>
    );
  }

  return (
    <QuestionPrompt
      key={`${clampedIndex}-${question.title}`}
      variant="embedded"
      questions={questions}
      questionIndex={clampedIndex}
      totalQuestions={totalQuestions}
      initialAnswer={localAnswers[clampedIndex]}
      submitLabel={part.input?.submitLabel}
      nextLabel={part.input?.nextLabel}
      skipLabel={part.input?.skipLabel}
      allowSkip={part.input?.allowSkip}
      onSubmit={(nextAnswer) => {
        setLocalAnswers((prev) => ({
          ...prev,
          [clampedIndex]: nextAnswer,
        }));
        part.input?.onSubmitAnswer?.(nextAnswer);
        if (clampedIndex < totalQuestions) {
          goNext();
        }
      }}
    />
  );
}
