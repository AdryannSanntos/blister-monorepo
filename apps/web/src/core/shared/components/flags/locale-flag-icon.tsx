import type { ComponentType, SVGProps } from "react";

import type { AppLocale } from "@/i18n/routing";

import { BrazilFlagIcon } from "./brazil-flag-icon";
import { UsaFlagIcon } from "./usa-flag-icon";

const localeFlagMap: Record<AppLocale, ComponentType<SVGProps<SVGSVGElement>>> = {
  "pt-BR": BrazilFlagIcon,
  en: UsaFlagIcon,
};

type LocaleFlagIconProps = SVGProps<SVGSVGElement> & {
  locale: AppLocale;
};

export const LocaleFlagIcon = ({
  locale,
  className,
  ...props
}: LocaleFlagIconProps) => {
  const Flag = localeFlagMap[locale];
  return <Flag className={className} {...props} />;
};
