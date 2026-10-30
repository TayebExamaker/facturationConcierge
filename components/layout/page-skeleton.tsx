import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Route-level loading UI. Rendered by each segment's `loading.tsx`, so it
 * shows *instantly* on navigation (Next prefetches up to this boundary) while
 * the server fetches data. Pure CSS — no client JS needed to animate.
 */

/** Shimmering placeholder block. */
export function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "animate-shimmer rounded-xl bg-[linear-gradient(90deg,hsl(var(--secondary))_0%,hsl(220_16%_97%)_50%,hsl(var(--secondary))_100%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

/** Indeterminate progress bar pinned to the top of the viewport. */
export function RouteProgress() {
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden"
    >
      <div className="h-full w-1/3 animate-route-progress rounded-full bg-foreground/80" />
    </div>
  );
}

function HeaderSkeleton({ actions = false, back = false }: { actions?: boolean; back?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-5 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        {back ? <Shimmer className="h-6 w-24 rounded-full" /> : null}
        <Shimmer className="h-3 w-20 rounded-md" />
        <Shimmer className="h-9 w-56 rounded-lg sm:h-10 sm:w-72" />
        <Shimmer className="h-4 w-64 max-w-full rounded-md sm:w-96" />
      </div>
      {actions ? (
        <div className="hidden gap-2 md:flex">
          <Shimmer className="h-10 w-28" />
          <Shimmer className="h-10 w-32" />
        </div>
      ) : null}
    </div>
  );
}

function Frame({ children, narrow }: { children: React.ReactNode; narrow?: "3xl" | "4xl" }) {
  return (
    <main
      aria-busy="true"
      className={cn(
        "container w-full flex-1 max-w-6xl pb-6 pt-3 sm:pt-8 lg:pb-14 lg:pt-10",
      )}
    >
      <RouteProgress />
      <div className={cn(narrow === "3xl" && "mx-auto max-w-3xl", narrow === "4xl" && "mx-auto max-w-4xl")}>
        {children}
      </div>
    </main>
  );
}

function ListRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="luxury-card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border/60 p-4 last:border-b-0">
          <Shimmer className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3.5 w-2/5 rounded-md" />
            <Shimmer className="h-3 w-1/4 rounded-md" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Shimmer className="h-3.5 w-20 rounded-md" />
            <Shimmer className="h-4 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Frame>
      <HeaderSkeleton actions />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="col-span-2 h-44 animate-pulse rounded-3xl bg-foreground/90 sm:h-40" />
        <Shimmer className="h-32 rounded-2xl" />
        <Shimmer className="h-32 rounded-2xl" />
      </div>
      <div className="mt-8 space-y-4">
        <Shimmer className="h-5 w-24 rounded-md" />
        <Shimmer className="h-11" />
        <div className="flex gap-2">
          {[64, 80, 72, 68].map((w, i) => (
            <Shimmer key={i} className="h-9 rounded-full" style={{ width: w }} />
          ))}
        </div>
        <ListRowsSkeleton />
      </div>
    </Frame>
  );
}

export function ClientsSkeleton() {
  return (
    <Frame>
      <HeaderSkeleton />
      <Shimmer className="mb-5 h-11 max-w-md" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="luxury-card space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-3.5 w-3/5 rounded-md" />
                <Shimmer className="h-3 w-2/5 rounded-md" />
              </div>
            </div>
            <Shimmer className="h-4 w-1/3 rounded-md" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ClientProfileSkeleton() {
  return (
    <Frame>
      <HeaderSkeleton back actions />
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Shimmer className="h-36 rounded-2xl" />
        <Shimmer className="hidden h-36 rounded-2xl sm:block" />
      </div>
      <ListRowsSkeleton rows={4} />
    </Frame>
  );
}

export function InvoiceSkeleton() {
  return (
    <Frame>
      <HeaderSkeleton back />
      <div className="mb-6 space-y-3">
        <Shimmer className="h-12 w-full md:w-[26rem]" />
        <Shimmer className="h-16 w-full md:h-10 md:w-80" />
      </div>
      <div className="luxury-card space-y-6 p-6 sm:p-8">
        <div className="flex justify-between">
          <Shimmer className="h-16 w-16" />
          <Shimmer className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Shimmer className="h-24" />
          <Shimmer className="h-24" />
        </div>
        <Shimmer className="h-40" />
      </div>
    </Frame>
  );
}

export function FormSkeleton() {
  return (
    <Frame narrow="4xl">
      <HeaderSkeleton />
      <div className="space-y-4">
        {[96, 180, 160, 220].map((h, i) => (
          <Shimmer key={i} className="rounded-2xl" style={{ height: h }} />
        ))}
      </div>
    </Frame>
  );
}

export function SimpleSkeleton() {
  return (
    <Frame narrow="3xl">
      <HeaderSkeleton />
      <Shimmer className="h-72 rounded-3xl" />
    </Frame>
  );
}
