"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, GitBranch, ArrowRight, AlertCircle, LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Repository } from "@/lib/types";

interface RepoFeatureRedirectProps {
  feature: "chat" | "graph" | "investigations" | "impact" | "documentation" | "evaluations";
  title: string;
  description: string;
  icon: LucideIcon;
}

export function RepoFeatureRedirect({
  feature,
  title,
  description,
  icon: Icon,
}: RepoFeatureRedirectProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    async function resolveRepository() {
      try {
        // 1. Check if user already has an active repository in localStorage
        const storedRepoId = typeof window !== "undefined"
          ? localStorage.getItem("codesage_active_repo_id")
          : null;

        if (storedRepoId) {
          try {
            const repo = await api.getRepository(storedRepoId);
            if (repo && repo.id) {
              router.replace(`/repositories/${repo.id}/${feature}`);
              return;
            }
          } catch {
            // Stored repo is invalid or was deleted; clear it
            localStorage.removeItem("codesage_active_repo_id");
          }
        }

        // 2. Fetch available repositories from user workspaces
        const workspaces = await api.getWorkspaces();
        if (workspaces.length === 0) {
          setRepositories([]);
          setLoading(false);
          return;
        }

        // Check the default or first workspace
        const wsId = workspaces[0].id;
        const repos = await api.getRepositories(wsId);
        setRepositories(repos);

        // 3. If repositories exist, auto-navigate to the first ready/available repo
        if (repos.length > 0) {
          const targetRepo = repos[0];
          localStorage.setItem("codesage_active_repo_id", targetRepo.id);
          router.replace(`/repositories/${targetRepo.id}/${feature}`);
          return;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load repository information.");
      } finally {
        setLoading(false);
      }
    }

    resolveRepository();
  }, [feature, router]);

  if (loading) {
    return (
      <AppShell>
        <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 select-none">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mb-4" />
          <p className="text-[14px] text-[#64748B]">
            Connecting to active repository...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#172033] tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
              <Icon className="w-5 h-5" />
            </div>
            <span>{title}</span>
          </h1>
          <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {repositories.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#172033]">
                No Repositories Connected
              </h2>
              <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed">
                CodeSage AI needs an indexed codebase to perform repository-aware {title.toLowerCase()}.
              </p>
            </div>
            <Link
              href="/repositories"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Connect or Import Repository</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-[15px] font-semibold text-[#172033]">
              Select a Repository to Continue
            </h2>
            <div className="divide-y divide-[#E2E8F0]">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="py-4 flex items-center justify-between hover:bg-[#F8FAFC] px-3 rounded-lg transition-colors"
                >
                  <div>
                    <h3 className="text-[14px] font-medium text-[#172033]">
                      {repo.name}
                    </h3>
                    <p className="text-[12px] text-[#64748B]">
                      {repo.primary_language || "Code"} &bull; {repo.file_count} files &bull; {repo.chunk_count} chunks
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem("codesage_active_repo_id", repo.id);
                      router.push(`/repositories/${repo.id}/${feature}`);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>Open {title}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
