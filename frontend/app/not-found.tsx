"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, ArrowLeft, LayoutDashboard, GitBranch, MessageSquareCode } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-[480px] bg-white border border-[#E2E8F0] rounded-2xl p-8 sm:p-10 shadow-sm text-center">
        {/* Brand Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center mx-auto mb-6 shadow-xs">
          <Code2 className="w-6 h-6" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-[12px] font-mono font-medium bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] mb-3">
          Error 404
        </span>

        <h1 className="text-[22px] font-semibold text-[#172033] tracking-tight mb-2">
          Page Not Found
        </h1>

        <p className="text-[13.5px] text-[#64748B] mb-8 leading-relaxed max-w-sm mx-auto">
          The requested page or resource could not be found. It may have been moved, renamed, or requires selecting an active repository.
        </p>

        {/* Quick Route Links */}
        <div className="space-y-2 mb-8">
          <Link
            href="/dashboard"
            className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-white text-[#172033] text-[13px] font-medium flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 text-[#2563EB]" />
              <span>Go to Overview Dashboard</span>
            </div>
            <span className="text-[#94A3B8] group-hover:text-[#2563EB] text-[12px]">&rarr;</span>
          </Link>

          <Link
            href="/repositories"
            className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-white text-[#172033] text-[13px] font-medium flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <GitBranch className="w-4 h-4 text-[#15803D]" />
              <span>Connected Repositories</span>
            </div>
            <span className="text-[#94A3B8] group-hover:text-[#15803D] text-[12px]">&rarr;</span>
          </Link>

          <Link
            href="/repositories/chat"
            className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-white text-[#172033] text-[13px] font-medium flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquareCode className="w-4 h-4 text-[#B45309]" />
              <span>Grounded AI Chat</span>
            </div>
            <span className="text-[#94A3B8] group-hover:text-[#B45309] text-[12px]">&rarr;</span>
          </Link>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-[13px] text-[#64748B] hover:text-[#172033] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to previous page</span>
        </button>
      </div>

      <p className="text-center text-[11.5px] text-[#94A3B8] mt-6">
        CodeSage AI &bull; Repository-Aware AI Software Engineering Assistant
      </p>
    </div>
  );
}
