import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   turbopack: {
      resolveAlias: {
        // Add any necessary aliases here if you're mapping '@mdi/js' to a different location
      },
    },
};

export default nextConfig;
