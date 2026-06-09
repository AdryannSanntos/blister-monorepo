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
    answerLabel?: string;
    answers?: Array<{ title: string; label: string }>;
  };
};

export type QuestionToolProps = {
  part: QuestionToolPart;
  chatStatus?: string;
};

function formatAnswer(question: QuestionConfig, answer: QuestionAnswer) {
  if (answer.kind === "skip") return "Pulado";
  if (answer.kind === "text") return answer.text?.trim() || "Respondido";

  const selectedIds = answer.selectedIds ?? [];
  if (selectedIds.length > 0 && question.options?.length) {
    const labels = selectedIds.map((id) => {
      const option = question.options!.find((entry) => entry.id === id);
      return option?.label ?? id;
    });
    if (answer.text?.trim()) {
      return `${labels.join(", ")} — ${answer.text.trim()}`;
    }
    return labels.join(", ");
  }

  return answer.text?.trim() || "Respondido";
}

function AnsweredQuestionCard({
  title,
  answerLabel,
}: {
  title: string;
  answerLabel: string;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
      <p className="text-sm font-medium text-[var(--fg-primary)]">{title}</p>
      <p className="mt-1.5 text-sm text-[var(--fg-secondary)]">{answerLabel}</p>
    </div>
  );
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

  const outputAnswer = part.output?.answer;
  const outputAnswers = part.output?.answers;
  const answeredCount = Object.keys(localAnswers).length;
  const isComplete =
    part.state === "output-available" ||
    Boolean(outputAnswer) ||
    Boolean(outputAnswers?.length) ||
    (totalQuestions === 1
      ? answeredCount >= 1
      : totalQuestions > 0 && answeredCount >= totalQuestions);

  const answeredEntries = useMemo(() => {
    if (outputAnswers?.length) {
      return outputAnswers.map((entry) => ({
        title: entry.title,
        label: entry.label,
      }));
    }

    if (totalQuestions > 1) {
      return Array.from({ length: totalQuestions }, (_, idx) => {
        const q = questions[idx];
        const answer = localAnswers[idx + 1];
        if (!q || !answer) return null;
        return {
          title: q.title,
          label: formatAnswer(q, answer),
        };
      }).filter((entry): entry is { title: string; label: string } =>
        Boolean(entry),
      );
    }

    const answer = outputAnswer ?? localAnswers[clampedIndex];
    if (!answer || !question) return [];

    const label =
      part.output?.answerLabel ?? formatAnswer(question, answer);

    return [{ title: question.title, label }];
  }, [
    clampedIndex,
    localAnswers,
    outputAnswer,
    outputAnswers,
    part.output?.answerLabel,
    question,
    questions,
    totalQuestions,
  ]);

  if (!question) return null;

  const goNext = () => {
    if (clampedIndex >= totalQuestions) return;
    part.input?.onNextQuestion?.();
    if (!isControlled) {
      setLocalIndex((prev) => Math.min(totalQuestions, prev + 1));
    }
  };

  if (isComplete && answeredEntries.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        {answeredEntries.map((entry) => (
          <AnsweredQuestionCard
            key={`${part.toolCallId}-${entry.title}`}
            title={entry.title}
            answerLabel={entry.label}
          />
        ))}
      </div>
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
