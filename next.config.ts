import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Cloud Run container (see Dockerfile).
  output: "standalone",
  async rewrites() {
    return {
      beforeFiles: [],
      // Files present in /public at build time are served statically. Anything created at
      // runtime (generated cuts, brand uploads, audio ads) falls through to the media route.
      afterFiles: [{ source: "/media/:path*", destination: "/api/media/:path*" }],
      fallback: [],
    };
  },
};

export default nextConfig;
