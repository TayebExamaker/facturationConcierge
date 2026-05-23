"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "@/app/login/actions";

const INITIAL_STATE: LoginState = { ok: false };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useFormState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          inputMode="email"
          placeholder="you@example.com"
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="h-11"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="pt-2 text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Access reserved to authorized staff
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="gold"
      disabled={pending}
      className="h-11 w-full"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export default LoginForm;
