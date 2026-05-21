import { FormDescription } from "src/core/shared/components/ui/form";

type TextareaFieldHintProps = {
  currentLength: number;
  maxLength: number;
  helperText?: string;
};

export function TextareaFieldHint({
  currentLength,
  maxLength,
  helperText,
}: TextareaFieldHintProps) {
  return (
    <FormDescription className="flex items-center justify-between gap-3">
      <span>{helperText ?? "Seja claro e objetivo."}</span>
      <span className="shrink-0 tabular-nums">
        {currentLength}/{maxLength}
      </span>
    </FormDescription>
  );
}
