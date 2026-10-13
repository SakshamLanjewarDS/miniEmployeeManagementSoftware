import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  compress: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
    }
    return config;
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "date-fns",
    ],
    staleTimes: {
      dynamic: 120,
      static: 600,
    },
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
