import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "clsx", "tailwind-merge"],
    staleTimes: {
      dynamic: 300,
      static: 600,
    },
  },
};

export default nextConfig;
