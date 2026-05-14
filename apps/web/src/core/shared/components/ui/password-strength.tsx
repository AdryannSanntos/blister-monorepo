import { Check, X } from "lucide-react";
import { cn } from "src/core/shared/utils";

const rules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Número", test: (p: string) => /[0-9]/.test(p) },
  { label: "Caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password: string): number {
  return rules.filter((r) => r.test(password)).length;
}

const strengthConfig = [
  { label: "", color: "bg-[var(--line-default)]" },
  { label: "Fraca", color: "bg-destructive" },
  { label: "Razoável", color: "bg-[var(--warning)]" },
  { label: "Boa", color: "bg-[var(--warning)]" },
  { label: "Forte", color: "bg-[var(--success)]" },
];

type PasswordStrengthProps = { password: string };

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const strength = getStrength(password);
  const config = strengthConfig[strength] ?? strengthConfig[0];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i <= strength ? config.color : "bg-[var(--line-default)]",
            )}
          />
        ))}
      </div>
      {config.label && (
        <p className="text-[11.5px] text-[var(--fg-tertiary)]">
          Força: <span className="font-medium text-[var(--fg-secondary)]">{config.label}</span>
        </p>
      )}
      <ul className="space-y-1">
        {rules.map((rule) => {
          const passed = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5 text-[11.5px]">
              {passed ? (
                <Check className="size-3 text-[var(--success)]" />
              ) : (
                <X className="size-3 text-[var(--fg-quaternary)]" />
              )}
              <span className={passed ? "text-[var(--fg-secondary)]" : "text-[var(--fg-quaternary)]"}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
