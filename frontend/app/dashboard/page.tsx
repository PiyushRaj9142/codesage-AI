"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  GitBranch,
  CheckCircle2,
  Clock,
  BarChart3,
  Plus,
  MessageSquareCode,
  Network,
  Bug,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileCode,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewDashboardData, Repository } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    async function loadDashboard() {
      try {
        const res = await api.getOverview();
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || {
    total_workspaces: 0,
    total_repositories: 0,
    indexed_repositories: 0,
    jobs_in_progress: 0,
    recent_evaluations_count: 0,
  };

  const firstRepo = data?.recent_repositories?.[0];

  return (
    <AppShell currentRepo={firstRepo}>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold text-[#172033] tracking-tight">
              Repository Intelligence Overview
            </h1>
            <p className="text-[14px] text-[#64748B]">
              Real-time codebase grounding, indexing pipelines, and retrieval benchmarks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/repositories"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[13px] font-medium shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Import Repository</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] flex items-center gap-3 text-[#B91C1C] text-[13px]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 5 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-[12px] font-medium">Workspaces</span>
              <Layers className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="text-[24px] font-semibold text-[#172033]">
              {summary.total_workspaces}
            </div>
          </div>

          <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-[12px] font-medium">Repositories</span>
              <GitBranch className="w-4 h-4 text-[#0F766E]" />
            </div>
            <div className="text-[24px] font-semibold text-[#172033]">
              {summary.total_repositories}
            </div>
          </div>

          <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-[12px] font-medium">Indexed Ready</span>
              <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
            </div>
            <div className="text-[24px] font-semibold text-[#15803D]">
              {summary.indexed_repositories}
            </div>
          </div>

          <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-[12px] font-medium">Jobs In Progress</span>
              <Clock className="w-4 h-4 text-[#B45309]" />
            </div>
            <div className="text-[24px] font-semibold text-[#B45309]">
              {summary.jobs_in_progress}
            </div>
          </div>

          <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-[12px] font-medium">Evaluation Runs</span>
              <BarChart3 className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="text-[24px] font-semibold text-[#172033]">
              {summary.recent_evaluations_count}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/repositories"
            className="p-4 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:shadow-xs transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-[#172033]">Import Repository</h3>
              <p className="text-[12px] text-[#64748B]">Public Git or ZIP</p>
            </div>
          </Link>

          <Link
            href={firstRepo ? `/repositories/${firstRepo.id}/chat` : "/repositories"}
            className="p-4 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:shadow-xs transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
              <MessageSquareCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-[#172033]">Ask Codebase</h3>
              <p className="text-[12px] text-[#64748B]">Grounded AI Chat</p>
            </div>
          </Link>

          <Link
            href={firstRepo ? `/repositories/${firstRepo.id}/graph` : "/repositories"}
            className="p-4 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:shadow-xs transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#15803D] group-hover:bg-[#15803D] group-hover:text-white transition-colors">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-[#172033]">Explore Architecture</h3>
              <p className="text-[12px] text-[#64748B]">Dependency Graph</p>
            </div>
          </Link>

          <Link
            href={firstRepo ? `/repositories/${firstRepo.id}/evaluations` : "/repositories"}
            className="p-4 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:shadow-xs transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-[#172033]">RAG Benchmark</h3>
              <p className="text-[12px] text-[#64748B]">Recall@5 & MRR</p>
            </div>
          </Link>
        </div>

        {/* Recent Repositories & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Repositories (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-[#172033]">
                  Connected Repositories
                </h2>
                <p className="text-[12px] text-[#64748B]">
                  Indexed codebases ready for evidence-backed questions.
                </p>
              </div>
              <Link
                href="/repositories"
                className="text-[12px] font-medium text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {data?.recent_repositories && data.recent_repositories.length > 0 ? (
                data.recent_repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/repositories/${repo.id}/chat`}
                          className="font-medium text-[14px] text-[#172033] hover:text-[#2563EB]"
                        >
                          {repo.name}
                        </Link>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                          {repo.branch || "main"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-[#64748B]">
                        <span>Language: <strong className="font-medium capitalize text-[#172033]">{repo.primary_language || "Code"}</strong></span>
                        <span>·</span>
                        <span>{repo.file_count} files</span>
                        <span>·</span>
                        <span>{repo.chunk_count} chunks</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[12px] font-medium ${
                          repo.status === "ready"
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : repo.status === "failed"
                            ? "bg-[#FEE2E2] text-[#B91C1C]"
                            : "bg-[#FEF3C7] text-[#B45309]"
                        }`}
                      >
                        {repo.status.toUpperCase()}
                      </span>
                      <Link
                        href={`/repositories/${repo.id}/chat`}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#2563EB] text-[12px] font-medium text-[#172033] transition-colors"
                      >
                        Open Chat
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[#64748B] text-[13px]">
                  No repositories imported yet. Click "Import Repository" above to get started.
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline (1 col) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#E2E8F0]">
              <h2 className="text-[15px] font-semibold text-[#172033]">
                Recent Ingestion Activity
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Repository pipeline events and evaluation triggers.
              </p>
            </div>

            <div className="p-5 space-y-4">
              {data?.recent_activity && data.recent_activity.length > 0 ? (
                data.recent_activity.map((act) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-[#172033]">{act.title}</p>
                      <p className="text-[11px] text-[#64748B]">{act.details}</p>
                      <span className="text-[10px] text-[#94A3B8]">
                        {new Date(act.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#64748B]">No recent activity recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
