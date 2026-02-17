import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nerdcube.games',
        pathname: '/icons/**',
      },
    ],
  },
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
      {
        source: '/edgewise',
        destination: 'https://grid-games-edgewise.vercel.app/edgewise',
      },
      {
        source: '/edgewise/:path*',
        destination: 'https://grid-games-edgewise.vercel.app/edgewise/:path*',
      },
      {
        source: '/carom',
        destination: 'https://grid-games-carom.vercel.app/carom',
      },
      {
        source: '/carom/:path*',
        destination: 'https://grid-games-carom.vercel.app/carom/:path*',
      },
      {
        source: '/trio',
        destination: 'https://grid-games-trio.vercel.app/trio',
      },
      {
        source: '/trio/:path*',
        destination: 'https://grid-games-trio.vercel.app/trio/:path*',
      },
      {
        source: '/tessera',
        destination: 'https://grid-games-tessera.vercel.app/tessera',
      },
      {
        source: '/tessera/:path*',
        destination: 'https://grid-games-tessera.vercel.app/tessera/:path*',
      },
    ];
  },
};

export default nextConfig;
