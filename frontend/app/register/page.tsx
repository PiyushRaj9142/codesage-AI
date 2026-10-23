"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { setAuthTokens } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.register(name, email, password);
      setAuthTokens(res.access_token, res.refresh_token, res.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 select-none">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#172033] tracking-tight">
              CodeSage AI
            </h1>
            <p className="text-[12px] text-[#64748B]">
              Repository-Aware Software Engineering Assistant
            </p>
          </div>
        </div>

        <h2 className="text-[20px] font-semibold text-[#172033] mb-1">Create an account</h2>
        <p className="text-[13px] text-[#64748B] mb-6">
          Get started understanding unfamiliar codebases with evidence-backed answers.
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] flex items-start gap-2.5 text-[#B91C1C] text-[13px]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice Engineer"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[14px] text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@company.com"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[14px] text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
              Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[14px] text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-medium flex items-center justify-center gap-2 transition-colors disabled:bg-[#93C5FD] shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#E2E8F0] text-center text-[13px] text-[#64748B]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#2563EB] font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
