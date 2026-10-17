import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable double rendering and double effect execution in development
  reactStrictMode: false,

  // Turbopack configuration
  turbopack: {
    root: path.resolve(process.cwd()),
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,

  // Keep compiled pages in memory for 1 hour instead of discarding them after 15 seconds
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 50,
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/storage/**"],
        aggregateTimeout: 200,
        poll: false,
      };
      config.devtool = "eval-cheap-module-source-map";
    }
    return config;
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "date-fns",
      "@prisma/client",
      "jose",
      "zod",
      "bcryptjs",
    ],
    staleTimes: {
      dynamic: 300,
      static: 1800,
    },
  },

  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
