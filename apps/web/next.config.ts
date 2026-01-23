import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/dabble',
        destination: 'https://grid-games-dabble.vercel.app/dabble',
      },
      {
        source: '/dabble/:path*',
        destination: 'https://grid-games-dabble.vercel.app/dabble/:path*',
      },
      {
        source: '/jumble',
        destination: 'https://grid-games-jumble.vercel.app/jumble',
      },
      {
        source: '/jumble/:path*',
        destination: 'https://grid-games-jumble.vercel.app/jumble/:path*',
      },
    ];
  },
};

export default nextConfig;
