"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, HelpCircle, ListChecks, XCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useAnswerSuspension,
  useRunSuspensions,
  type RunSuspension,
  type SuspensionField,
} from "src/core/modules/agents/hooks/use-agent-run-resume";
import { Button } from "src/core/shared/components/ui/button";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import { Label } from "src/core/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { cn } from "src/core/shared/utils";

// ─── Clarification ───────────────────────────────────────────────────────────

function ClarificationCard({
  suspension,
  orgId,
  runId,
}: {
  suspension: RunSuspension;
  orgId: string;
  runId: string;
}) {
  const answer = useAnswerSuspension(orgId);
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    answer.mutate({
      runId,
      suspensionId: suspension.id,
      answers: { clarification: text.trim() },
    });
  }

  const isAnswered = suspension.status === "answered";

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--warning)]/40 bg-[color-mix(in_oklch,var(--warning)_6%,var(--bg-raised))] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[color-mix(in_oklch,var(--warning)_15%,var(--bg-base))] text-[var(--warning)]">
          <HelpCircle className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            {suspension.resolvedPayload.title && (
              <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
                {suspension.resolvedPayload.title}
              </p>
            )}
            {suspension.resolvedPayload.prompt && (
              <p className="mt-1 text-[12.5px] text-[var(--fg-secondary)]">
                {suspension.resolvedPayload.prompt}
              </p>
            )}
          </div>
          {!isAnswered && (
            <div className="flex gap-2">
              <Textarea
                placeholder="Escreva sua resposta..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
              />
            </div>
          )}
          {!isAnswered && (
            <Button
              size="sm"
              onClick={submit}
              disabled={!text.trim() || answer.isPending}
            >
              Responder
            </Button>
          )}
          {isAnswered && (
            <p className="text-[11.5px] text-[var(--fg-tertiary)]">
              Respondido — o agente está continuando.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Form ────────────────────────────────────────────────────────────────────

function buildFormSchema(fields: SuspensionField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let schema: z.ZodTypeAny;
    if (f.type === "boolean") {
      schema = z.boolean().default(false);
    } else if (f.type === "number") {
      schema = z.coerce.number();
    } else if (f.type === "multi_select") {
      schema = z.array(z.string());
    } else {
      schema = z.string();
    }
    shape[f.id] = f.required ? schema : schema.optional();
  }
  return z.object(shape);
}

function FormCard({
  suspension,
  orgId,
  runId,
}: {
  suspension: RunSuspension;
  orgId: string;
  runId: string;
}) {
  const answer = useAnswerSuspension(orgId);
  const fields = suspension.resolvedPayload.fields ?? [];
  const schema = buildFormSchema(fields);
  const form = useForm({ resolver: zodResolver(schema), mode: "onBlur" });
  const isAnswered = suspension.status === "answered";

  function onSubmit(data: Record<string, unknown>) {
    answer.mutate({ runId, suspensionId: suspension.id, answers: data });
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--warning)]/40 bg-[color-mix(in_oklch,var(--warning)_6%,var(--bg-raised))] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[color-mix(in_oklch,var(--warning)_15%,var(--bg-base))] text-[var(--warning)]">
          <ListChecks className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            {suspension.resolvedPayload.title && (
              <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
                {suspension.resolvedPayload.title}
              </p>
            )}
            {suspension.resolvedPayload.prompt && (
              <p className="mt-1 text-[12.5px] text-[var(--fg-secondary)]">
                {suspension.resolvedPayload.prompt}
              </p>
            )}
          </div>

          {!isAnswered && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {fields.map((field) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={field.id}
                    render={({ field: rhfField }) => (
                      <FormItem>
                        <FormLabel className="text-[12.5px]">
                          {field.label}
                          {field.required && (
                            <span className="ml-0.5 text-[var(--danger)]">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          {field.type === "textarea" ? (
                            <Textarea
                              {...rhfField}
                              value={rhfField.value as string ?? ""}
                              placeholder={field.label}
                              className="resize-none text-sm"
                            />
                          ) : field.type === "single_select" &&
                            field.options ? (
                            <Select
                              value={rhfField.value as string ?? ""}
                              onValueChange={rhfField.onChange}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Selecionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === "boolean" ? (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`field-${field.id}`}
                                checked={!!rhfField.value}
                                onCheckedChange={rhfField.onChange}
                              />
                              <Label
                                htmlFor={`field-${field.id}`}
                                className="text-sm"
                              >
                                {field.label}
                              </Label>
                            </div>
                          ) : (
                            <Input
                              {...rhfField}
                              value={rhfField.value as string ?? ""}
                              placeholder={field.label}
                              type={field.type === "number" ? "number" : "text"}
                              className="text-sm"
                            />
                          )}
                        </FormControl>
                        <FormMessage className="text-[11.5px]" />
                      </FormItem>
                    )}
                  />
                ))}
                <Button
                  type="submit"
                  size="sm"
                  disabled={answer.isPending}
                >
                  Enviar
                </Button>
              </form>
            </Form>
          )}
          {isAnswered && (
            <p className="text-[11.5px] text-[var(--fg-tertiary)]">
              Formulário enviado — o agente está continuando.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function ValidationCard({
  suspension,
  orgId,
  runId,
}: {
  suspension: RunSuspension;
  orgId: string;
  runId: string;
}) {
  const answer = useAnswerSuspension(orgId);
  const isAnswered = suspension.status === "answered";

  function respond(approved: boolean) {
    answer.mutate({
      runId,
      suspensionId: suspension.id,
      answers: { approved, feedback: "" },
    });
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--info)]/40 bg-[color-mix(in_oklch,var(--info)_6%,var(--bg-raised))] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[color-mix(in_oklch,var(--info)_15%,var(--bg-base))] text-[var(--info)]">
          <CheckCircle className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            {suspension.resolvedPayload.title && (
              <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
                {suspension.resolvedPayload.title}
              </p>
            )}
            {suspension.resolvedPayload.prompt && (
              <p className="mt-1 text-[12.5px] text-[var(--fg-secondary)]">
                {suspension.resolvedPayload.prompt}
              </p>
            )}
          </div>
          {!isAnswered && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => respond(true)}
                disabled={answer.isPending}
                className="gap-1.5"
              >
                <CheckCircle className="size-3.5" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(false)}
                disabled={answer.isPending}
                className="gap-1.5 text-[var(--danger)] hover:border-[var(--danger)]/40 hover:bg-[color-mix(in_oklch,var(--danger)_6%,transparent)]"
              >
                <XCircle className="size-3.5" />
                Rejeitar
              </Button>
            </div>
          )}
          {isAnswered && (
            <p className="text-[11.5px] text-[var(--fg-tertiary)]">
              Validação concluída — o agente está continuando.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

type SuspensionCardProps = {
  runId: string;
  orgId: string;
};

export function AgentRunSuspensionCards({ runId, orgId }: SuspensionCardProps) {
  const { data: suspensions, isLoading } = useRunSuspensions(orgId, runId);

  if (isLoading || !suspensions?.length) return null;

  const pending = suspensions.filter((s) => s.status === "pending");
  if (!pending.length) return null;

  return (
    <div className={cn("w-full space-y-3")}>
      {pending.map((suspension) => {
        if (suspension.suspensionType === "clarification") {
          return (
            <ClarificationCard
              key={suspension.id}
              suspension={suspension}
              orgId={orgId}
              runId={runId}
            />
          );
        }
        if (suspension.suspensionType === "form") {
          return (
            <FormCard
              key={suspension.id}
              suspension={suspension}
              orgId={orgId}
              runId={runId}
            />
          );
        }
        if (suspension.suspensionType === "validation") {
          return (
            <ValidationCard
              key={suspension.id}
              suspension={suspension}
              orgId={orgId}
              runId={runId}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
