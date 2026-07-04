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
  // Keep pdfjs-dist out of the server bundle: the PDF parser (lib/pdf/parse.ts)
  // resolves the legacy worker file at runtime with require.resolve, which only
  // works when the package stays a real on-disk node_modules dependency (also
  // lets Vercel's dependency tracer ship the worker file with the function).
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withPWA(nextConfig);
