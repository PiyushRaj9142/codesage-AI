"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  GitCommit,
  GitBranch,
  Layers,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Menu,
} from "lucide-react";
import { api } from "@/lib/api";
import { Workspace, Repository } from "@/lib/types";

interface TopNavProps {
  currentRepo?: Repository | null;
  onMenuToggle?: () => void;
}

export function TopNav({ currentRepo, onMenuToggle }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activeWsId, setActiveWsId] = useState<string>("");

  useEffect(() => {
    async function loadNavData() {
      try {
        const wsList = await api.getWorkspaces();
        setWorkspaces(wsList);
        if (wsList.length > 0 && !activeWsId) {
          const defaultWs = currentRepo ? currentRepo.workspace_id : wsList[0].id;
          setActiveWsId(defaultWs);
          const repoList = await api.getRepositories(defaultWs);
          setRepositories(repoList);
        }
      } catch {
        // Handled silently
      }
    }
    loadNavData();
  }, [currentRepo]);

  const handleWorkspaceChange = async (wsId: string) => {
    setActiveWsId(wsId);
    try {
      const repoList = await api.getRepositories(wsId);
      setRepositories(repoList);
      if (repoList.length > 0) {
        router.push(`/repositories/${repoList[0].id}/chat`);
      } else {
        router.push("/repositories");
      }
    } catch {
      // Handled
    }
  };

  const handleRepoChange = (repoId: string) => {
    const currentSubpath = pathname.split("/").slice(3).join("/") || "chat";
    router.push(`/repositories/${repoId}/${currentSubpath}`);
  };

  const statusConfig = {
    ready: { label: "Indexed & Ready", bg: "bg-[#DCFCE7]", text: "text-[#15803D]", icon: CheckCircle2 },
    failed: { label: "Indexing Failed", bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]", icon: AlertCircle },
    cloning: { label: "Cloning...", bg: "bg-[#FEF3C7]", text: "text-[#B45309]", icon: Clock },
    filtering: { label: "Filtering...", bg: "bg-[#FEF3C7]", text: "text-[#B45309]", icon: Clock },
    parsing: { label: "Parsing AST...", bg: "bg-[#FEF3C7]", text: "text-[#B45309]", icon: Clock },
    embedding: { label: "Generating Embeddings...", bg: "bg-[#FEF3C7]", text: "text-[#B45309]", icon: Clock },
    pending: { label: "Queued", bg: "bg-[#F1F5F9]", text: "text-[#64748B]", icon: Clock },
  };

  const currentStatus = currentRepo?.status ? statusConfig[currentRepo.status] : null;
  const StatusIcon = currentStatus?.icon;

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-1.5 text-[#64748B] hover:text-[#172033] rounded-md"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Workspace Selector */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#64748B]" />
          <select
            value={activeWsId}
            onChange={(e) => handleWorkspaceChange(e.target.value)}
            className="text-[13px] font-medium text-[#172033] bg-transparent border-0 focus:ring-0 cursor-pointer pr-6"
            aria-label="Select workspace"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-[#CBD5E1]">/</span>

        {/* Repository Selector */}
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[#64748B]" />
          <select
            value={currentRepo?.id || ""}
            onChange={(e) => handleRepoChange(e.target.value)}
            className="text-[13px] font-medium text-[#172033] bg-transparent border-0 focus:ring-0 cursor-pointer pr-6"
            aria-label="Select repository"
          >
            <option value="" disabled>Select Repository</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name} ({repo.primary_language || "code"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right details: branch, commit, status badge */}
      {currentRepo && (
        <div className="flex items-center gap-3">
          {/* Commit Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#F1F5F9] rounded-md text-[12px] font-mono text-[#64748B] border border-[#E2E8F0]">
            <GitCommit className="w-3.5 h-3.5 text-[#64748B]" />
            <span>{currentRepo.commit_sha ? currentRepo.commit_sha.slice(0, 7) : "HEAD"}</span>
          </div>

          {/* Status Badge */}
          {currentStatus && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${currentStatus.bg} ${currentStatus.text}`}
            >
              {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
              <span>{currentStatus.label}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
