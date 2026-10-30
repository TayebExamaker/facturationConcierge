import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { FadeIn } from "@/components/motion/primitives";

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <FadeIn className="luxury-card w-full max-w-lg space-y-6 p-10 text-center sm:p-14">
          <div className="flex justify-center">
            <Logo size={64} />
          </div>
          <div>
            <p className="text-6xl font-semibold tracking-tighter text-foreground/10 sm:text-7xl">
              404
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Page not found
            </h1>
            <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground">
              The page you&rsquo;re looking for has slipped past the concierge.
              Let&rsquo;s get you back to the lobby.
            </p>
          </div>
          <div className="flex justify-center">
            <Button asChild variant="gold" size="lg">
              <Link href="/dashboard">
                <ArrowLeft />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </PageShell>
  );
}
