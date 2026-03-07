import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'dist',
  images: {
    unoptimized: true
  },
  serverExternalPackages: ['better-sqlite3', 'duckdb'],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('better-sqlite3');
      // Prevent webpack from statically analyzing native modules
      config.module.exprContextCritical = false;
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "fs": false,
      "path": false,
    };
    return config;
  },
};

export default nextConfig;
