"use client";

import type { ChatStatus, UIMessage } from "ai";
import { useCallback, useState } from "react";

import type { SuggestionItem } from "@/components/agent-elements/input/suggestions";
import { MessageList } from "@/components/agent-elements/message-list";
import type { CustomToolRendererProps } from "@/components/agent-elements/types";
import type {
  QuestionAnswer,
  QuestionConfig,
} from "@/components/agent-elements/question/question-prompt";
import { cn } from "@/components/agent-elements/utils/cn";

import { AgentChatComposer } from "./agent-chat-composer";
import { AgentChatEmptyState } from "./agent-chat-empty-state";
import type { AgentUiConfig } from "../config/agent-ui-config";

type BlisterAgentChatProps = {
  config: AgentUiConfig;
  placeholder: string;
  messages: UIMessage[];
  status: ChatStatus;
  suggestions: SuggestionItem[];
  onSend: (message: { role: "user"; content: string }) => void;
  onStop: () => void;
  toolRenderers?: Record<string, React.ComponentType<CustomToolRendererProps>>;
  showCopyToolbar?: boolean;
  questionTool?: {
    submitLabel?: string;
    skipLabel?: string;
    allowSkip?: boolean;
    onAnswer?: (payload: {
      toolCallId?: string;
      question: QuestionConfig;
      answer: QuestionAnswer;
    }) => void;
  };
  className?: string;
};

export function BlisterAgentChat({
  config,
  placeholder,
  messages,
  status,
  suggestions,
  onSend,
  onStop,
  toolRenderers,
  showCopyToolbar = true,
  questionTool,
  className,
}: BlisterAgentChatProps) {
  const [draft, setDraft] = useState("");
  const isEmpty = messages.length === 0;
  const isStreaming = status === "streaming" || status === "submitted";
  const pendingQuestion = findPendingQuestion(messages, questionTool);
  const Icon = config.icon;

  const handleSuggestionSelect = useCallback(
    (item: SuggestionItem) => {
      if (isStreaming) return;
      const content = (item.value ?? item.label).trim();
      if (!content) return;
      onSend({ role: "user", content });
      setDraft("");
    },
    [isStreaming, onSend],
  );

  const handleSend = useCallback(
    (message: { role: "user"; content: string }) => {
      onSend(message);
      setDraft("");
    },
    [onSend],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[var(--bg-canvas)]",
        className,
      )}
    >
      {isEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <AgentChatEmptyState icon={Icon} />
        </div>
      ) : (
        <MessageList
          messages={messages}
          status={status}
          toolRenderers={toolRenderers}
          showCopyToolbar={showCopyToolbar}
          suppressQuestionTool={Boolean(pendingQuestion)}
          className="min-h-0 flex-1 bg-[var(--bg-canvas)]"
        />
      )}

      <AgentChatComposer
        placeholder={placeholder}
        status={status}
        draft={draft}
        onDraftChange={setDraft}
        onSend={handleSend}
        onStop={onStop}
        suggestions={isEmpty ? suggestions : []}
        onSuggestionSelect={isEmpty ? handleSuggestionSelect : undefined}
        questionBar={
          pendingQuestion
            ? {
                id: pendingQuestion.id,
                questions: pendingQuestion.questions,
                questionIndex: pendingQuestion.questionIndex,
                totalQuestions: pendingQuestion.totalQuestions,
                onPreviousQuestion: pendingQuestion.onPreviousQuestion,
                onNextQuestion: pendingQuestion.onNextQuestion,
                submitLabel: pendingQuestion.submitLabel,
                skipLabel: pendingQuestion.skipLabel,
                allowSkip: pendingQuestion.allowSkip,
                onSubmit: (answer) => {
                  questionTool?.onAnswer?.({
                    toolCallId: pendingQuestion.toolCallId,
                    question:
                      pendingQuestion.questions[
                        pendingQuestion.questionIndex
                          ? pendingQuestion.questionIndex - 1
                          : 0
                      ],
                    answer,
                  });
                },
              }
            : undefined
        }
      />
    </div>
  );
}

function findPendingQuestion(
  messages: UIMessage[],
  questionTool: BlisterAgentChatProps["questionTool"],
) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    const parts = message.parts ?? [];
    for (let p = parts.length - 1; p >= 0; p -= 1) {
      const part = parts[p] as {
        type?: string;
        toolCallId?: string;
        input?: {
          questions?: QuestionConfig[];
          question?: QuestionConfig;
          questionIndex?: number;
          totalQuestions?: number;
          onPreviousQuestion?: () => void;
          onNextQuestion?: () => void;
          submitLabel?: string;
          skipLabel?: string;
          allowSkip?: boolean;
        };
        output?: {
          answer?: QuestionAnswer;
        };
      };
      if (part?.type !== "tool-Question") continue;
      const input = part.input;
      const questions = input?.questions ?? [];
      const firstQuestion = questions[0] ?? input?.question;
      if (!firstQuestion) continue;
      if (part.output?.answer) return null;
      return {
        id: part.toolCallId ?? `question-${i}-${p}`,
        toolCallId: part.toolCallId,
        questions,
        question: firstQuestion,
        questionIndex: input?.questionIndex,
        totalQuestions:
          input?.totalQuestions ??
          (questions.length > 0 ? questions.length : undefined),
        onPreviousQuestion: input?.onPreviousQuestion,
        onNextQuestion: input?.onNextQuestion,
        submitLabel: questionTool?.submitLabel ?? input?.submitLabel,
        skipLabel: questionTool?.skipLabel ?? input?.skipLabel,
        allowSkip: questionTool?.allowSkip ?? input?.allowSkip,
      };
    }
  }
  return null;
}
