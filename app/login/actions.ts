"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  buildSessionToken,
  verifyCredentials,
} from "@/lib/auth";

export type LoginState = {
  ok: boolean;
  error?: string;
};

const SAFE_PATH_RE = /^\/[A-Za-z0-9_\-./]*$/;

function sanitizeRedirect(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  if (raw === "/login" || raw.startsWith("/login")) return "/dashboard";
  // Only same-origin absolute paths — block protocol-relative `//evil.com`.
  if (!SAFE_PATH_RE.test(raw)) return "/dashboard";
  return raw;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = sanitizeRedirect(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  let valid: boolean;
  try {
    valid = verifyCredentials(email, password);
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Auth not configured: ${e.message}`
          : "Auth configuration error.",
    };
  }

  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  const token = await buildSessionToken();
  cookies().set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  redirect(next);
}

export async function logoutAction(): Promise<void> {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
