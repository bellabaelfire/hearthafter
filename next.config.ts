import type { NextConfig } from "next";
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
const configuredImages = projectId && /^[a-z0-9]+$/.test(projectId) && /^[a-z0-9_-]+$/.test(dataset);
const config: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",
    remotePatterns: configuredImages ? [{protocol: "https", hostname: "cdn.sanity.io", port: "", pathname: `/images/${projectId}/${dataset}/**`, search: ""}] : [],
    localPatterns: [{pathname: "/art/**", search: ""}],
    qualities: [75],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    maximumRedirects: 0,
  },
  poweredByHeader: false,
  devIndicators: false,
  agentRules: false,
  reactStrictMode: true,
  experimental: {webpackBuildWorker: true},
  async headers() {
    return [{source: "/:path*", headers: [
      {key: "X-Content-Type-Options", value: "nosniff"},
      {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
      {key: "X-Frame-Options", value: "SAMEORIGIN"},
      // Script/connect restrictions need a separate authenticated Studio test.
      {key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'"},
      {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()"},
    ]}];
  },
};
export default config;
