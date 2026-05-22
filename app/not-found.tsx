import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="luxury-card p-10 sm:p-14 max-w-xl w-full text-center space-y-6">
          <div className="flex justify-center">
            <Logo size={72} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gold flex items-center justify-center gap-2">
              <KeyRound className="h-3 w-3" />
              404
            </p>
            <h1 className="font-serif text-5xl mt-3">Page not found</h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-prose mx-auto">
              The page you&rsquo;re looking for has slipped past the concierge.
              Let&rsquo;s get you back to the lobby.
            </p>
          </div>
          <div className="gold-divider" aria-hidden="true" />
          <div className="flex justify-center">
            <Button asChild variant="gold">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
