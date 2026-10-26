"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { DependencyGraphViewer } from "@/components/graph/DependencyGraph";
import { Repository, DependencyGraph } from "@/lib/types";

export default function ArchitectureExplorerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const repoId = resolvedParams.id;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [graphData, setGraphData] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        const repo = await api.getRepository(repoId);
        setRepository(repo);
        if (typeof window !== "undefined" && repo?.id) {
          localStorage.setItem("codesage_active_repo_id", repo.id);
        }

        const graph = await api.getDependencyGraph(repoId);
        setGraphData(graph);
      } catch (err: any) {
        setError(err.message || "Failed to load architecture graph.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [repoId, router]);

  const handleSelectFile = (filePath: string) => {
    router.push(`/repositories/${repoId}/chat`);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  return (
    <AppShell currentRepo={repository}>
      <div className="h-[calc(100vh-4rem)] p-6 flex flex-col space-y-4">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-[20px] font-semibold text-[#172033] tracking-tight">
              Architecture & Dependency Explorer
            </h1>
            <p className="text-[13px] text-[#64748B]">
              Static import graph and module relationships extracted via Tree-sitter parsers.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#FEE2E2] text-[#B91C1C] text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 min-h-0">
          {graphData && (
            <DependencyGraphViewer data={graphData} onSelectFile={handleSelectFile} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
