import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
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
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withPWA(nextConfig);
