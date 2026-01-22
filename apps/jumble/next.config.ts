import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When deployed with the monorepo, apps are served at their path
  // basePath is set via NEXT_PUBLIC_BASE_PATH env var, or empty for standalone
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Ensure assets are loaded from the correct path
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;
