import { PlatformCompanyDetailPage } from "src/core/modules/platform-admin/pages/platform-company-detail-page";

type AdminCompanyDetailRouteProps = {
  params: Promise<{ companyId: string }>;
};

export default async function AdminCompanyDetailRoute({
  params,
}: AdminCompanyDetailRouteProps) {
  const { companyId } = await params;

  return <PlatformCompanyDetailPage companyId={companyId} />;
}
