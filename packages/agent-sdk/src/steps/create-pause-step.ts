import type { z } from 'zod';
import type { StepExecutionContext, StepExecutor, StepResult } from '../core/types';
import { zodToJsonSchema } from '../schemas/zod-to-json-schema';

export type PauseType = 'design_plan_approval' | 'form' | 'confirm' | 'file_upload';

export type PreviewBlock = 'planning' | 'output' | 'formQuestion';

export interface CreatePauseStepOptions {
  pauseType: PauseType;
  /** When this returns true the run continues instead of pausing. */
  until: (context: StepExecutionContext) => boolean;
  /** Builds the form schema shown to the user while paused. */
  getFormSchema?: (context: StepExecutionContext) => z.ZodType | Record<string, unknown>;
  pauseReason?: string;
  /** Which block to emit before pausing, so the UI can render a preview. */
  previewBlock?: PreviewBlock;
  /** Output committed when the run continues past the pause. */
  onContinue?: (context: StepExecutionContext) => Record<string, unknown>;
}

const toFormSchema = (
  schema: z.ZodType | Record<string, unknown> | undefined,
  pauseType: PauseType,
): Record<string, unknown> => {
  if (!schema) return { type: pauseType };
  return 'safeParse' in schema ? zodToJsonSchema(schema as z.ZodType) : schema;
};

/**
 * Generic human-in-the-loop pause. Unifies approval, form collection,
 * confirmation and file upload: continues when `until` holds, otherwise emits
 * an optional preview block and pauses with a form schema.
 */
export const createPauseStep = (options: CreatePauseStepOptions): StepExecutor => {
  return async (context, deps): Promise<StepResult> => {
    if (options.until(context)) {
      return {
        type: 'CONTINUE',
        output: options.onContinue ? options.onContinue(context) : {},
      };
    }

    const formSchema = toFormSchema(options.getFormSchema?.(context), options.pauseType);

    if (deps.message) {
      if (options.previewBlock === 'formQuestion') {
        await deps.message.formQuestion(formSchema);
      }
    }

    return {
      type: 'PAUSED',
      pauseReason: options.pauseReason ?? 'Aguardando ação do usuário.',
      pauseFormSchema: formSchema,
    };
  };
};
