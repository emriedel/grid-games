import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  transpilePackages: ['@grid-games/ui', '@grid-games/config', '@grid-games/shared'],
};

export default nextConfig;
