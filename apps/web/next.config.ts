import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const internalApiBaseUrl = (
  process.env.NEXT_PUBLIC_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@company-os/authz", "@company-os/types", "@vidstack/react"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  async redirects() {
    return [
      {
        source: "/:locale/dashboard/brand",
        destination: "/:locale/dashboard/settings",
        permanent: true,
      },
      {
        source: "/dashboard/brand",
        destination: "/dashboard/settings",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
