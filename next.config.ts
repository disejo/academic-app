import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    resolveAlias: {
      // Add any necessary aliases here if you're mapping '@mdi/js' to a different location
    },
  },
  experimental: {
    optimizeCss: false
  }
};

export default nextConfig;
