import { IconArrowUp, IconPlayerStopFilled } from "@tabler/icons-react";
import { cn } from "../utils/cn";

export type SendButtonProps = {
  state: "idle" | "typing" | "streaming";
};

export function SendButton({ state }: SendButtonProps) {
  const isStreaming = state === "streaming";
  const isTyping = state === "typing";

  if (isStreaming) {
    return (
      <div className="size-7 rounded-full bg-[var(--fg-primary)] flex items-center justify-center cursor-pointer">
        <IconPlayerStopFilled className="size-4 text-[var(--bg-base)]" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "size-7 rounded-full flex items-center justify-center transition-colors",
        isTyping
          ? "bg-[var(--accent)] cursor-pointer hover:bg-[var(--accent-hover)]"
          : "bg-[var(--bg-raised)] cursor-default",
      )}
    >
      <IconArrowUp
        className={cn(
          "size-4",
          isTyping
            ? "text-[var(--fg-on-accent,#fff)]"
            : "text-[var(--fg-quaternary)]",
        )}
      />
    </div>
  );
}
