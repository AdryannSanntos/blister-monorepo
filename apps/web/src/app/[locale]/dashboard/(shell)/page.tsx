import { LayoutDashboard } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageLayout } from "src/core/shared/components/ui/page-layout";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  return (
    <PageLayout
      icon={LayoutDashboard}
      title={t("welcomeTitle")}
      description={t("welcomeSubtitle")}
    >
      {null}
    </PageLayout>
  );
}
