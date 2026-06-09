"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import { Button } from "@/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/core/shared/components/ui/dropdown-menu";
import { LocaleFlagIcon } from "@/core/shared/components/flags/locale-flag-icon";

const localeLabels: Record<AppLocale, string> = {
  "pt-BR": "Português (BR)",
  en: "English",
};

const locales = Object.keys(localeLabels) as AppLocale[];

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const handleLocaleChange = (nextLocale: AppLocale) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("localeSwitcher.label")}
        >
          <LocaleFlagIcon locale={locale} className="size-5 rounded-[3px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((item) => (
          <DropdownMenuItem
            key={item}
            onClick={() => handleLocaleChange(item)}
            className={locale === item ? "font-medium" : undefined}
          >
            <LocaleFlagIcon locale={item} className="mr-2 size-4 rounded-[2px]" />
            {localeLabels[item]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
