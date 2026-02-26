import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",
  // Allow images from any hostname (update to specific domains in production)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // Proxy backend API routes to Express.
  // /api/auth/* is intentionally excluded — handled by NextAuth route handler.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: "/api/posts/:path*",
          destination: "http://backend:5000/api/posts/:path*",
        },
        {
          source: "/api/faqs/:path*",
          destination: "http://backend:5000/api/faqs/:path*",
        },
        {
          source: "/api/admin/:path*",
          destination: "http://backend:5000/api/admin/:path*",
        },
        {
          source: "/api/health",
          destination: "http://backend:5000/api/health",
        },
        {
          source: "/api/uploads/:path*",
          destination: "http://backend:5000/uploads/:path*",
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
