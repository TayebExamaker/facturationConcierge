import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth";

// Routes the middleware *matches* but never gates — login flow + the offline
// fallback (must be reachable from the service worker without a session).
const PUBLIC_PATHS = new Set<string>(["/login", "/offline"]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authed = await verifySessionToken(token);

  // /login: bounce to dashboard if already authed; otherwise let through.
  if (PUBLIC_PATHS.has(pathname)) {
    if (authed && pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Preserve the originally requested destination so we can bounce back
    // after a successful sign-in.
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Sliding session: every authenticated request extends the cookie's lifetime
  // by another full window. Users who open the PWA at least once per 90 days
  // are never asked to sign in again.
  const res = NextResponse.next();
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token!,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

// Match everything *except* Next.js internals, static PWA assets, and image
// optimization — those must stay open so the app shell, service worker, and
// install prompt all work pre-auth.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|manifest.json|manifest.webmanifest|sw.js|workbox-.*|sw-.*|icons/|brand/|share-target).*)",
  ],
};
