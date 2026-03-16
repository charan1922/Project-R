import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  distDir: 'dist',
  images: {
    unoptimized: true
  },
  serverExternalPackages: ['duckdb', '@duckdb/node-api', '@prisma/client', '.prisma/client'],
  turbopack: {},
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@duckdb/node-api');
      // Prevent webpack from statically analyzing native modules
      config.module.exprContextCritical = false;
    }
    config.resolve.extensions = [...(config.resolve.extensions || []), '.json'];
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "fs": false,
      "path": false,
    };
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  tunnelRoute: "/monitoring",
});
