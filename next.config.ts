import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [
      {
        source: "/sounds/:path*",
        destination: "/sound/:path*",
      },
    ];
  },
};

export default nextConfig;

