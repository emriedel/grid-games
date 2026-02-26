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
      // Analytics proxy to avoid ad blockers
      {
        source: '/a/lib.min.js',
        destination: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
      },
      {
        source: '/a/lib.js',
        destination: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.js',
      },
      {
        source: '/a/decide',
        destination: 'https://decide.mixpanel.com/decide',
      },
      {
        source: '/a/:path*',
        destination: 'https://api.mixpanel.com/:path*',
      },
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
        source: '/inlay',
        destination: 'https://grid-games-inlay.vercel.app/inlay',
      },
      {
        source: '/inlay/:path*',
        destination: 'https://grid-games-inlay.vercel.app/inlay/:path*',
      },
    ];
  },
};

export default nextConfig;
