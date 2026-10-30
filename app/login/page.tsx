import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { FadeIn } from "@/components/motion/primitives";
import { COMPANY } from "@/lib/company";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { LoginHero } from "./login-hero";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams?: { next?: string | string[] };
}

function pickNext(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) raw = raw[0];
  return typeof raw === "string" ? raw : "/dashboard";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Already authenticated → straight to dashboard (or the original target).
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) {
    redirect(pickNext(searchParams?.next));
  }

  const next = pickNext(searchParams?.next);

  return (
    <div className="min-h-[100dvh] w-full bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      <LoginHero />

      <div className="relative -mt-8 flex justify-center px-4 pb-[calc(2rem+var(--safe-bottom))] lg:mt-0 lg:items-center lg:px-10 lg:py-12">
        <FadeIn delay={0.15} className="w-full max-w-md">
          <div className="luxury-card p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.4)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <div className="mb-6">
              <p className="eyebrow">Staff access</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Sign in to manage {COMPANY.name} invoices.
              </p>
            </div>
            <LoginForm next={next} />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
