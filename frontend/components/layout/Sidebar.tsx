"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  GitBranch,
  MessageSquareCode,
  Network,
  Bug,
  Split,
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Code2,
  ChevronRight,
} from "lucide-react";
import { getCurrentUser, clearAuth } from "@/lib/auth";

interface SidebarProps {
  currentRepoId?: string;
}

export function Sidebar({ currentRepoId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getCurrentUser();

  const [storedRepoId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("codesage_active_repo_id");
    }
    return null;
  });

  useEffect(() => {
    if (currentRepoId && typeof window !== "undefined") {
      localStorage.setItem("codesage_active_repo_id", currentRepoId);
    }
  }, [currentRepoId]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const effectiveRepoId = currentRepoId || storedRepoId;
  const repoBase = effectiveRepoId ? `/repositories/${effectiveRepoId}` : "/repositories";

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Workspaces", href: "/workspaces", icon: Layers },
    { name: "Repositories", href: "/repositories", icon: GitBranch },
    { name: "AI Chat", href: `${repoBase}/chat`, icon: MessageSquareCode, requiresRepo: true },
    { name: "Architecture Explorer", href: `${repoBase}/graph`, icon: Network, requiresRepo: true },
    { name: "Bug Investigation", href: `${repoBase}/investigations`, icon: Bug, requiresRepo: true },
    { name: "Change Impact Analysis", href: `${repoBase}/impact`, icon: Split, requiresRepo: true },
    { name: "Documentation Generator", href: `${repoBase}/documentation`, icon: FileText, requiresRepo: true },
    { name: "RAG Evaluation", href: `${repoBase}/evaluations`, icon: BarChart3, requiresRepo: true },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <Link
        href="/dashboard"
        className="h-16 flex items-center px-6 border-b border-[#E2E8F0] gap-3 hover:bg-[#F8FAFC] transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
          <Code2 className="w-5 h-5" />
        </div>
        <div>
          <span className="font-semibold text-[15px] text-[#172033] tracking-tight block">
            CodeSage AI
          </span>
          <span className="text-[11px] text-[#64748B] block font-mono">
            Hybrid RAG v1.0
          </span>
        </div>
      </Link>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          Workspace Navigation
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-[#F1F5F9] text-[#2563EB]"
                  : "text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#2563EB]" : "text-[#64748B]"}`} />
              <span className="truncate">{item.name}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E2E8F0]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-[#172033]">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-[12px] font-medium text-[#172033] truncate">
                {user?.name || "Developer"}
              </p>
              <p className="text-[11px] text-[#64748B] truncate">
                {user?.email || "developer@codesage.dev"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 text-[#64748B] hover:text-[#B91C1C] hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
