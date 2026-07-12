import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow next/image to optimize images from our object storage.
    // Local MinIO now; add the R2 public host for production.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9200", pathname: "/**" },
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com", pathname: "/**" },
    ],
    // Local MinIO resolves to a private IP; Next 16 blocks optimizing those by
    // default (SSRF protection). Allow it in dev only — production serves from
    // R2's public https host, which is not a local IP.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
};

export default nextConfig;
