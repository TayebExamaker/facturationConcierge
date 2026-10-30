"use client";

import * as React from "react";
import { motion } from "motion/react";

import { Logo } from "@/components/brand/logo";
import { EASE_OUT } from "@/components/motion/primitives";
import { COMPANY } from "@/lib/company";

/**
 * Ink brand panel for the sign-in screen: slow-drifting light orbs over a
 * faint grid. Full-height column on desktop, rounded header on phones.
 */
export function LoginHero() {
  return (
    <div className="relative isolate flex flex-col justify-between overflow-hidden rounded-b-[2rem] bg-foreground px-6 pb-16 pt-[calc(var(--safe-top)+2.5rem)] text-white lg:min-h-[100dvh] lg:rounded-none lg:px-12 lg:py-12">
      {/* Grid texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_right,black_20%,transparent_70%)]"
      />
      {/* Drifting orbs */}
      <motion.div
        aria-hidden="true"
        className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-slate-400/25 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -bottom-32 -left-20 -z-10 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="flex items-center gap-3"
      >
        <Logo size={44} />
        <div className="leading-tight">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]">Concierge One</p>
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/50">Group Ltd</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
        className="mt-10 lg:mt-0"
      >
        <h1 className="max-w-md text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Invoicing,
          <br />
          <span className="text-white/50">concierge-grade.</span>
        </h1>
        <p className="mt-4 hidden max-w-sm text-sm leading-relaxed text-white/60 lg:block">
          Create, import and track every invoice for {COMPANY.name} — from any
          device, installed like a native app.
        </p>
      </motion.div>

      <p className="hidden text-[10px] uppercase tracking-[0.32em] text-white/40 lg:block">
        {COMPANY.name}
      </p>
    </div>
  );
}

export default LoginHero;
