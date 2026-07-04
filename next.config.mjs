import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // cacheOnFrontEndNav alone caches navigations conservatively. We deliberately
  // do NOT enable aggressiveFrontEndNavCaching — it pre-caches every navigated
  // route's RSC payload, which masks newly created/updated invoices behind a
  // stale cache after mutations (router.refresh can't bust it).
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict Mode double-renders client components in dev and surfaces spurious
  // hydration warnings that don't reproduce in production. We rely on
  // ClientOnly + structured islands to guarantee correctness instead.
  reactStrictMode: false,
  // The PDF parser (lib/pdf/parse.ts) extracts text via `unpdf`, whose embedded
  // pdf.js build runs on the main thread with no web worker. Keeping it external
  // means Vercel's file tracer includes the real node_modules copy (statically
  // imported, so it's traced correctly) instead of webpack rewriting unpdf's
  // internal dynamic imports of the pdf.js serverless build.
  experimental: {
    serverComponentsExternalPackages: ["unpdf"],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withPWA(nextConfig);
