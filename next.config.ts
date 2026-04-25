import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable parallel worker threads to prevent middleware-manifest.json
    // race condition in Next.js 15 where page-data workers start before
    // manifests are written (TES-169 / TES-123).
    workerThreads: false,
  },
};

export default nextConfig;
