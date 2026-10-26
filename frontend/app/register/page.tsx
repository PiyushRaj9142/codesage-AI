"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { setAuthTokens } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await api.register(name.trim(), email.trim(), password);
      setAuthTokens(res.access_token, res.refresh_token, res.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("fetch") || message.includes("Failed to fetch") || message.includes("NetworkError")) {
        setError("Unable to connect to the CodeSage AI backend. Please verify the backend is running on http://localhost:8000.");
      } else {
        setError(message || "Registration failed. Please check your inputs.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-[440px]">
        {/* Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 sm:p-9 shadow-sm">
          {/* Header & Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[16px] font-semibold text-[#172033] tracking-tight block">
                CodeSage AI
              </span>
              <span className="text-[12px] text-[#64748B] block">
                Repository-Aware Engineering Assistant
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-[22px] font-semibold text-[#172033] tracking-tight">
              Create an account
            </h1>
            <p className="text-[13.5px] text-[#64748B] mt-1 leading-relaxed">
              Start exploring unfamiliar codebases with evidence-backed answers.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] flex items-start gap-2.5 text-[#B91C1C] text-[13px] leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="register-name"
                className="block text-[13px] font-medium text-[#172033] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[14px] text-[#172033] placeholder-[#94A3B8] hover:border-[#CBD5E1] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#BFDBFE] transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-[13px] font-medium text-[#172033] mb-1.5"
              >
                Work email
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[14px] text-[#172033] placeholder-[#94A3B8] hover:border-[#CBD5E1] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#BFDBFE] transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-[13px] font-medium text-[#172033] mb-1.5"
              >
                Password (min. 8 characters)
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#E2E8F0] rounded-xl text-[14px] text-[#172033] placeholder-[#94A3B8] hover:border-[#CBD5E1] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#BFDBFE] transition-all"
                />
                <button
                  type="button"
                  id="toggle-register-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#172033] focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="signup-button"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-[14px] font-medium flex items-center justify-center gap-2 transition-colors disabled:bg-[#93C5FD] disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Sign in Link */}
          <div className="mt-7 pt-6 border-t border-[#E2E8F0] text-center text-[13px] text-[#64748B]">
            Already have an account?{" "}
            <Link
              href="/login"
              id="sign-in-link"
              className="text-[#2563EB] font-medium hover:underline focus:outline-none focus:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Small subtle branding footnote */}
        <p className="text-center text-[11.5px] text-[#94A3B8] mt-6">
          CodeSage AI &bull; Grounded Code Intelligence with Exact Line Citations
        </p>
      </div>
    </main>
  );
}
