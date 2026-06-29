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
      {
        source: "/:locale/dashboard/campaigns",
        destination: "/:locale/dashboard/projects",
        permanent: true,
      },
      {
        source: "/dashboard/campaigns",
        destination: "/dashboard/projects",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/pieces",
        destination: "/:locale/dashboard/agents/cuts/overview",
        permanent: true,
      },
      {
        source: "/dashboard/pieces",
        destination: "/dashboard/agents/cuts/overview",
        permanent: true,
      },
      {
        source: "/:locale/workspaces/admin",
        destination: "/:locale/admin",
        permanent: true,
      },
      {
        source: "/workspaces/admin",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/:locale/workspaces",
        destination: "/:locale/dashboard",
        permanent: true,
      },
      {
        source: "/workspaces",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/workspace/settings",
        destination: "/:locale/dashboard/settings",
        permanent: true,
      },
      {
        source: "/dashboard/workspace/settings",
        destination: "/dashboard/settings",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/agents/:slug/results",
        destination: "/:locale/dashboard/agents/:slug/overview",
        permanent: true,
      },
      {
        source: "/dashboard/agents/:slug/results",
        destination: "/dashboard/agents/:slug/overview",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/agents/:slug/history",
        destination: "/:locale/dashboard/agents/:slug/overview",
        permanent: true,
      },
      {
        source: "/dashboard/agents/:slug/history",
        destination: "/dashboard/agents/:slug/overview",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/agents/:slug",
        destination: "/:locale/dashboard/agents/:slug/overview",
        permanent: true,
      },
      {
        source: "/dashboard/agents/:slug",
        destination: "/dashboard/agents/:slug/overview",
        permanent: false,
      },
      {
        source: "/:locale/auth/signup",
        destination: "/:locale/auth/login",
        permanent: true,
      },
      {
        source: "/auth/signup",
        destination: "/auth/login",
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
