import type { NextConfig } from "next";

const normalizeOrigin = (value: string | undefined, fallback: string) => {
  const normalized = String(value || fallback).trim().replace(/\/$/, "");
  return normalized || fallback;
};

const legacyWebOrigin = normalizeOrigin(process.env.LEGACY_WEB_ORIGIN, "http://127.0.0.1:3000");
const legacyApiOrigin = normalizeOrigin(process.env.LEGACY_API_ORIGIN, "http://127.0.0.1:5050");

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  compress: true,
  crossOrigin: "anonymous",
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  async headers() {
    return [
      {
        source: "/api/health",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${legacyApiOrigin}/api/:path*`,
        },
        {
          source: "/",
          destination: `${legacyWebOrigin}/`,
        },
        {
          source: "/:path*",
          destination: `${legacyWebOrigin}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
