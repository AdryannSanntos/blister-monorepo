import { MarketplaceItemPage } from "src/core/modules/marketplace/pages/marketplace-item-page";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { itemId } = await params;
  return <MarketplaceItemPage itemId={itemId} />;
}
