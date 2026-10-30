import type { Metadata, Viewport } from "next";
import "./globals.css";
import ToasterIsland from "./_toaster-island";
import ClientOnly from "@/components/client-only";
import { AppChrome } from "@/components/layout/app-chrome";
import { AppSplash } from "@/components/layout/app-splash";

export const metadata: Metadata = {
  title: "Concierge One Invoicing",
  description: "Invoice manager for CONCIERGE ONE GROUP LTD",
  applicationName: "COG Invoice",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "COG Invoice",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F8FA",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Draw under the notch / home indicator; chrome pads with env(safe-area-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: extensions navigateur (Dark Reader, Grammarly,
    // traducteurs auto, gestionnaires de mots de passe) injectent souvent des
    // attributs sur <html>/<body> entre le rendu serveur et l'hydratation.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Poppins en CSS direct — évite la className dynamique de
            next/font/google qui peut différer entre builds en HMR. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- direct CSS link chosen over next/font/google to avoid hashed class HMR drift */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {/* L'intégralité du body est rendu côté client après mount —
            aucune surface SSR/CSR à reconcilier. AppChrome = sidebar /
            tab bar persistantes entre les navigations. */}
        <ClientOnly fallback={<AppSplash />}>
          <AppChrome>{children}</AppChrome>
        </ClientOnly>
        <ToasterIsland />
      </body>
    </html>
  );
}
