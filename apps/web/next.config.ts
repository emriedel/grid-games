import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const dabbleUrl = process.env.DABBLE_URL;
    const jumbleUrl = process.env.JUMBLE_URL;

    // Only configure rewrites if the URLs are set (production)
    const rewrites = [];

    if (dabbleUrl) {
      rewrites.push({
        source: '/dabble',
        destination: `${dabbleUrl}/dabble`,
      });
      rewrites.push({
        source: '/dabble/:path*',
        destination: `${dabbleUrl}/dabble/:path*`,
      });
    }

    if (jumbleUrl) {
      rewrites.push({
        source: '/jumble',
        destination: `${jumbleUrl}/jumble`,
      });
      rewrites.push({
        source: '/jumble/:path*',
        destination: `${jumbleUrl}/jumble/:path*`,
      });
    }

    return rewrites;
  },
};

export default nextConfig;
