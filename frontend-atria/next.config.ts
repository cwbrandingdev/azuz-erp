import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";
import { getAllowedDevOrigins } from "./lib/tenancy/tenant-host";

const require = createRequire(import.meta.url);

function copyPdfWorker() {
  try {
    const workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
    const publicDir = path.join(process.cwd(), "public");
    mkdirSync(publicDir, { recursive: true });
    copyFileSync(workerSrc, path.join(publicDir, "pdf.worker.min.mjs"));
  } catch (error) {
    console.warn("[next.config] Could not copy pdf.worker.min.mjs", error);
  }
}

copyPdfWorker();

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
  serverExternalPackages: ["pdfjs-dist"],
  transpilePackages: ["react-pdf"],
  turbopack: {
    resolveAlias: {
      canvas: "./lib/empty-module.ts",
    },
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "atria-erp.onrender.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "atria-backend-broken-night-9242.fly.dev",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cwbranding.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "sktjeijgyvulpzuzbmff.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/agenda", destination: "/calendar", permanent: true },
      {
        source: "/dashboards/financeiro",
        destination: "/financial",
        permanent: true,
      },
      {
        source: "/dashboards/criacao",
        destination: "/kanban",
        permanent: true,
      },
      {
        source: "/creation",
        destination: "/kanban",
        permanent: false,
      },
      {
        source: "/creation/:path*",
        destination: "/kanban",
        permanent: false,
      },
      {
        source: "/dashboards/performance",
        destination: "/insights",
        permanent: true,
      },
      {
        source: "/settings",
        destination: "/settings/branding",
        permanent: true,
      },
      {
        source: "/dashboard/proposals",
        destination: "/proposals",
        permanent: false,
      },
      {
        source: "/dashboard/proposals/new",
        destination: "/proposals/new",
        permanent: false,
      },
      {
        source: "/dashboard/proposals/:id/edit",
        destination: "/proposals/:id/edit",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
