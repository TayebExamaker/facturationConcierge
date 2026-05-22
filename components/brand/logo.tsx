import * as React from "react";

import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  withWordmark?: boolean;
}

/**
 * Official Concierge One Group key-mark. Served as a public asset
 * (`/brand/logo.jpeg`) so it appears in every invoice — header, PDF, dashboard
 * nav. Treated as a fixed brand asset; do not regenerate.
 */
export function Logo({
  size = 40,
  withWordmark = false,
  className,
  ...props
}: LogoProps) {
  // Scale the corner radius gently with size so it stays balanced.
  const radius = Math.max(6, Math.round((size / 96) * 14));

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      aria-label={COMPANY.name}
      {...props}
    >
      <img
        src="/brand/logo.jpeg"
        alt={`${COMPANY.name} mark`}
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        style={{ borderRadius: radius }}
        className="block object-cover shrink-0"
      />

      {withWordmark ? (
        <div className="flex flex-col leading-tight">
          <span className="text-base sm:text-lg font-semibold uppercase tracking-[0.18em] text-foreground">
            Concierge One
          </span>
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            Group Ltd
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default Logo;
