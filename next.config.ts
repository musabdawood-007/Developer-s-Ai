import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel auto-handles output, do NOT use "standalone" on Vercel */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
