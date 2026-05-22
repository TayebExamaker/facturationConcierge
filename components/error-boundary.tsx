"use client";

import * as React from "react";
import { toAppError } from "@/lib/errors";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Luxury fallback error boundary. Catches render errors in any subtree and
 * shows a dark card with gold heading + reload button. Wrap routes/pages:
 *
 *   <ErrorBoundary>{children}</ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Best-effort log; swallow normalization failures.
    try {
      const normalized = toAppError(error);
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", normalized.code, normalized.message, info);
    } catch {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary] caught:", error, info);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    const description =
      error.message && error.message.trim().length > 0
        ? error.message
        : "An unexpected error interrupted this view.";

    return (
      <div
        role="alert"
        className="min-h-[60vh] w-full flex items-center justify-center px-4 py-12"
      >
        <div className="max-w-md w-full rounded-2xl border border-amber-500/20 bg-zinc-950/90 shadow-2xl p-8 text-zinc-100">
          <h2 className="text-2xl font-semibold tracking-tight text-amber-400 mb-3">
            Something went wrong
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed mb-6 break-words">
            {description}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
