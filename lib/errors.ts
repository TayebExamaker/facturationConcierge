/**
 * App-wide error type and normalization.
 *
 * Every catch boundary in the app should funnel through `toAppError` so the
 * UI layer can render consistent toasts via `errorToToast`.
 */

export type AppErrorCode =
  | "DUPLICATE_INVOICE"
  | "PARSE_FAILED"
  | "INVALID_INPUT"
  | "NETWORK"
  | "STORAGE"
  | "UNKNOWN";

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
    // Preserve prototype chain across transpilation targets.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function isAppError(value: unknown): value is AppError {
  return (
    value instanceof AppError ||
    (typeof value === "object" &&
      value !== null &&
      (value as { name?: string }).name === "AppError" &&
      typeof (value as { code?: unknown }).code === "string")
  );
}

/**
 * Normalize any thrown value into an `AppError`. Inspects common shapes:
 * - existing AppError -> passthrough
 * - native Error -> infer code from message ("network", "fetch", "storage", ...)
 * - string / other -> wrap as UNKNOWN
 */
export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err as AppError;

  if (err instanceof Error) {
    const msg = err.message || "Unexpected error";
    const lower = msg.toLowerCase();
    if (
      lower.includes("network") ||
      lower.includes("fetch") ||
      lower.includes("offline") ||
      lower.includes("timeout")
    ) {
      return new AppError("NETWORK", msg, err);
    }
    if (
      lower.includes("storage") ||
      lower.includes("quota") ||
      lower.includes("supabase")
    ) {
      return new AppError("STORAGE", msg, err);
    }
    if (lower.includes("parse") || lower.includes("pdf")) {
      return new AppError("PARSE_FAILED", msg, err);
    }
    if (lower.includes("duplicate")) {
      return new AppError("DUPLICATE_INVOICE", msg, err);
    }
    if (lower.includes("invalid") || lower.includes("validation")) {
      return new AppError("INVALID_INPUT", msg, err);
    }
    return new AppError("UNKNOWN", msg, err);
  }

  if (typeof err === "string" && err.trim()) {
    return new AppError("UNKNOWN", err);
  }

  return new AppError("UNKNOWN", "Something went wrong.", err);
}

export function errorToToast(err: AppError): {
  title: string;
  description: string;
} {
  switch (err.code) {
    case "DUPLICATE_INVOICE":
      return {
        title: "Duplicate invoice",
        description:
          err.message ||
          "An invoice with this number and client already exists.",
      };
    case "PARSE_FAILED":
      return {
        title: "Couldn't read that PDF",
        description:
          "We couldn't auto-extract the invoice details. Please fill them in manually.",
      };
    case "INVALID_INPUT":
      return {
        title: "Check the form",
        description:
          err.message || "Some fields are missing or have invalid values.",
      };
    case "NETWORK":
      return {
        title: "Network error",
        description:
          "We couldn't reach the server. Check your connection and try again.",
      };
    case "STORAGE":
      return {
        title: "Storage error",
        description:
          err.message ||
          "Saving failed. Your changes may not have been recorded.",
      };
    case "UNKNOWN":
    default:
      return {
        title: "Something went wrong",
        description:
          err.message || "An unexpected error occurred. Please try again.",
      };
  }
}
