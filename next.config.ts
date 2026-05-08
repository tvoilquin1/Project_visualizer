import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export not needed — Vercel handles SSR
  // Optimizations for Vercel deployment:
  output: 'standalone', // Smaller deployment size
  images: {
    unoptimized: true, // No external image optimization needed
  },
};

export default nextConfig;
