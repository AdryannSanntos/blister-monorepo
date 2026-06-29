import type { CarouselSocialNetwork } from "@company-os/types";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTiktok,
} from "@tabler/icons-react";
import type { ComponentType, SVGProps } from "react";

const NETWORK_ICONS: Record<
  CarouselSocialNetwork,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  instagram: IconBrandInstagram,
  facebook: IconBrandFacebook,
  tiktok: IconBrandTiktok,
};

type CarouselSocialNetworkIconProps = {
  network: CarouselSocialNetwork;
  className?: string;
};

export const CarouselSocialNetworkIcon = ({
  network,
  className,
}: CarouselSocialNetworkIconProps) => {
  const Icon = NETWORK_ICONS[network];
  return <Icon className={className} aria-hidden />;
};
