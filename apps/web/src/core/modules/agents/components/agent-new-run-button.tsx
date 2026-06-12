"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCutsRunModalContext } from "src/core/modules/agents/components/cuts/cuts-run-modal-provider";
import { getAgentNewPath } from "src/core/modules/agents/utils/agent-paths";
import { Button } from "src/core/shared/components/ui/button";

import { Link } from "@/i18n/routing";

type AgentNewRunButtonProps = {
  routeSlug: string;
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

const CutsNewRunButton = ({
  size,
  variant,
  className,
}: Pick<AgentNewRunButtonProps, "size" | "variant" | "className">) => {
  const t = useTranslations("agents.nav");
  const cutsModal = useCutsRunModalContext();

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      data-testid="cuts-new-run-button"
      onClick={cutsModal.handleOpen}
    >
      <Plus className="size-4" aria-hidden />
      {size === "icon" || size === "icon-sm" ? (
        <span className="sr-only">{t("newGeneration")}</span>
      ) : (
        t("newGeneration")
      )}
    </Button>
  );
};

export const AgentNewRunButton = ({
  routeSlug,
  size = "default",
  variant = "default",
  className,
}: AgentNewRunButtonProps) => {
  const t = useTranslations("agents.nav");

  if (routeSlug === "cuts") {
    return <CutsNewRunButton size={size} variant={variant} className={className} />;
  }

  return (
    <Button asChild size={size} variant={variant} className={className}>
      <Link href={getAgentNewPath(routeSlug)} className="gap-1.5">
        <Plus className="size-4" aria-hidden />
        {size === "icon" || size === "icon-sm" ? (
          <span className="sr-only">{t("newGeneration")}</span>
        ) : (
          t("newGeneration")
        )}
      </Link>
    </Button>
  );
};

export const AgentNewRunIconButton = ({
  routeSlug,
  className,
}: Pick<AgentNewRunButtonProps, "routeSlug" | "className">) => {
  return (
    <AgentNewRunButton routeSlug={routeSlug} size="icon-sm" variant="ghost" className={className} />
  );
};
