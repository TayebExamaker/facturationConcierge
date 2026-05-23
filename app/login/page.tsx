import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { COMPANY } from "@/lib/company";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { LoginForm } from "./login-form";

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
    <div className="min-h-screen w-full bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center text-center gap-4">
            <Logo size={56} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                {COMPANY.name}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl mt-2">
                Sign in
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Concierge One Invoicing — staff access
              </p>
            </div>
          </div>

          <div className="luxury-card p-6 sm:p-8">
            <LoginForm next={next} />
          </div>
        </div>
      </div>
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <span className="serif tracking-widest uppercase">
          {COMPANY.name}
        </span>
      </footer>
    </div>
  );
}
