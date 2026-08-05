"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredAdminToken, setStoredAdminToken, useAdminAuthGuard } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { isReady } = useAdminAuthGuard({
    requireToken: false,
    redirectPath: "/",
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existingToken = getStoredAdminToken();
    if (existingToken) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || "Invalid email or password.");
        return;
      }

      if (payload?.success && payload?.token) {
        setStoredAdminToken(payload.token);
        router.push("/");
        return;
      }

      setError("Unable to sign in right now.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B1A]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070B1A] px-4 py-10">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:28px_28px]" />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur-xl md:grid-cols-2">
        {/* Left branding panel */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-indigo-600/20 via-transparent to-cyan-500/10 p-10 md:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                Admin Portal
              </span>
            </div>

            <h1 className="mt-6 text-3xl font-bold leading-tight text-white">
              STEMSaathi
              <span className="block bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
                Command Center
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Manage every incoming school inquiry, demo request, and
              partnership lead — all in one secure dashboard.
            </p>
          </div>

          <div className="space-y-4">
            {[
              "Real-time lead tracking",
              "Secure, token-based access",
              "Instant status updates",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 text-emerald-400">
                    <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-8 md:hidden">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                Admin Portal
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">STEMSaathi Admin</h1>
          </div>

          <div className="mb-8 hidden md:block">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-400">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                    <path d="M3 5.5A1.5 1.5 0 014.5 4h11A1.5 1.5 0 0117 5.5v9A1.5 1.5 0 0115.5 16h-11A1.5 1.5 0 013 14.5v-9z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 5.5L10 10.5L16 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@stemsaathi.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                    <rect x="4" y="8.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6.5 8.5V6a3.5 3.5 0 017 0v2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-slate-500 transition hover:text-slate-300"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path d="M3 3L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M8.35 5.1A7.4 7.4 0 0110 5c4.5 0 7.5 5 7.5 5a12.6 12.6 0 01-2.4 3M6.2 6.35A12.4 12.4 0 002.5 10s3 5 7.5 5c.8 0 1.55-.13 2.25-.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M8.2 8.2a2.25 2.25 0 003.1 3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="13.3" r="0.9" fill="currentColor" />
                </svg>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:from-indigo-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 transition group-hover:translate-x-0.5">
                    <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-600">
            Restricted access · STEMSaathi internal use only
          </p>
        </div>
      </div>
    </div>
  );
}