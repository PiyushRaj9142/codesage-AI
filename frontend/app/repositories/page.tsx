"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Plus,
  Upload,
  RefreshCw,
  Trash2,
  ExternalLink,
  MessageSquareCode,
  Network,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  FolderArchive,
  FileCode,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Repository, Workspace, RepositoryStatus } from "@/lib/types";

export default function RepositoriesPage() {
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Import Form State
  const [importType, setImportType] = useState<"git" | "zip">("git");
  const [repoName, setRepoName] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Polling tracker for active indexing repos
  const [activeJobs, setActiveJobs] = useState<Record<string, RepositoryStatus>>({});

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        const wsList = await api.getWorkspaces();
        setWorkspaces(wsList);
        if (wsList.length > 0) {
          const wsId = wsList[0].id;
          setSelectedWsId(wsId);
          const repoList = await api.getRepositories(wsId);
          setRepositories(repoList);
        }
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Polling active jobs
  useEffect(() => {
    const indexingRepos = repositories.filter(
      (r) => r.status && ["pending", "cloning", "filtering", "parsing", "embedding"].includes(r.status)
    );

    if (indexingRepos.length === 0) return;

    const interval = setInterval(async () => {
      for (const repo of indexingRepos) {
        try {
          const status = await api.getRepositoryStatus(repo.id);
          setActiveJobs((prev) => ({ ...prev, [repo.id]: status }));

          if (status.status === "ready" || status.status === "failed") {
            // Refresh repo list
            const updated = await api.getRepositories(selectedWsId);
            setRepositories(updated);
          }
        } catch {
          // Handled
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [repositories, selectedWsId]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (importType === "git") {
        if (!gitUrl.startsWith("http://") && !gitUrl.startsWith("https://")) {
          throw new Error("Only valid HTTP/HTTPS Git URLs are supported.");
        }
        await api.importGitRepository(selectedWsId, repoName, gitUrl, gitBranch);
      } else {
        if (!zipFile) {
          throw new Error("Please select a .zip archive to upload.");
        }
        await api.uploadZipRepository(selectedWsId, repoName, zipFile);
      }

      setModalOpen(false);
      setRepoName("");
      setGitUrl("");
      setZipFile(null);

      // Refresh list
      const updated = await api.getRepositories(selectedWsId);
      setRepositories(updated);
    } catch (err: any) {
      setFormError(err.message || "Failed to import repository.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReindex = async (repoId: string) => {
    try {
      await api.triggerIndexing(repoId);
      const updated = await api.getRepositories(selectedWsId);
      setRepositories(updated);
    } catch (err: any) {
      alert(err.message || "Failed to trigger indexing");
    }
  };

  const handleDelete = async (repoId: string) => {
    if (!confirm("Are you sure you want to delete this repository and its vector index?")) return;
    try {
      await api.deleteRepository(repoId);
      setRepositories((prev) => prev.filter((r) => r.id !== repoId));
    } catch (err: any) {
      alert(err.message || "Failed to delete repository");
    }
  };

  return (
    <AppShell currentRepo={repositories[0]}>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold text-[#172033] tracking-tight">
              Repository Management
            </h1>
            <p className="text-[13px] text-[#64748B]">
              Connect Git repositories or upload ZIP archives for structure-aware AST parsing and hybrid retrieval.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[13px] font-medium shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Repository</span>
          </button>
        </div>

        {/* Repositories List */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">
            <span>Indexed Repositories ({repositories.length})</span>
            <span>Status & Actions</span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {repositories.length > 0 ? (
              repositories.map((repo) => {
                const job = activeJobs[repo.id];
                const isIndexing = ["pending", "cloning", "filtering", "parsing", "embedding"].includes(repo.status);

                return (
                  <div key={repo.id} className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/repositories/${repo.id}/chat`}
                          className="font-semibold text-[15px] text-[#172033] hover:text-[#2563EB]"
                        >
                          {repo.name}
                        </Link>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                          {repo.source_type.toUpperCase()} · {repo.branch || "main"}
                        </span>
                        {repo.commit_sha && (
                          <span className="text-[11px] font-mono text-[#94A3B8]">
                            @{repo.commit_sha.slice(0, 7)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#64748B]">
                        <span>Language: <strong className="font-medium text-[#172033] capitalize">{repo.primary_language || "Code"}</strong></span>
                        <span>·</span>
                        <span>{repo.file_count} files</span>
                        <span>·</span>
                        <span>{repo.chunk_count} code chunks</span>
                        {repo.source_url && (
                          <>
                            <span>·</span>
                            <a
                              href={repo.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2563EB] hover:underline flex items-center gap-1 font-mono truncate max-w-xs"
                            >
                              <span>{repo.source_url}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>

                      {/* Live Indexing Progress Bar */}
                      {isIndexing && (
                        <div className="mt-2 pt-2 border-t border-[#E2E8F0] space-y-1.5 max-w-md">
                          <div className="flex items-center justify-between text-[11px] text-[#B45309] font-medium">
                            <span>Stage: {job?.stage || repo.status}</span>
                            <span>{job?.progress || 25}%</span>
                          </div>
                          <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#2563EB] h-full transition-all duration-300"
                              style={{ width: `${job?.progress || 25}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {repo.status === "failed" && repo.error_message && (
                        <p className="text-[12px] text-[#B91C1C] font-mono bg-[#FEE2E2] p-2 rounded-lg border border-[#FECACA]">
                          {repo.error_message}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/repositories/${repo.id}/chat`}
                        className="p-2 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] text-[#172033] hover:text-[#2563EB] transition-colors"
                        title="Open Chat"
                      >
                        <MessageSquareCode className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/repositories/${repo.id}/graph`}
                        className="p-2 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] text-[#172033] hover:text-[#2563EB] transition-colors"
                        title="Architecture Explorer"
                      >
                        <Network className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleReindex(repo.id)}
                        disabled={isIndexing}
                        className="p-2 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] text-[#64748B] hover:text-[#172033] transition-colors disabled:opacity-50"
                        title="Re-index repository"
                      >
                        <RefreshCw className={`w-4 h-4 ${isIndexing ? "animate-spin" : ""}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(repo.id)}
                        className="p-2 rounded-lg border border-[#E2E8F0] hover:border-[#B91C1C] text-[#64748B] hover:text-[#B91C1C] transition-colors"
                        title="Delete repository"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-[#64748B]">
                <FolderArchive className="w-10 h-10 mx-auto text-[#94A3B8] mb-3" />
                <h3 className="text-[15px] font-semibold text-[#172033] mb-1">No repositories connected</h3>
                <p className="text-[13px] max-w-md mx-auto mb-4">
                  Import a public Git repository or upload a ZIP archive to enable grounded AI answers.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2 bg-[#2563EB] text-white text-[13px] font-medium rounded-xl hover:bg-[#1D4ED8] transition-colors"
                >
                  Connect your first repository
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Import Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-semibold text-[#172033]">Connect Repository</h3>
                  <p className="text-[12px] text-[#64748B]">Choose a public Git repository or upload an archive.</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-[#94A3B8] hover:text-[#172033] text-sm"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="m-5 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] flex items-center gap-2.5 text-[#B91C1C] text-[13px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleImport} className="p-5 space-y-4">
                {/* Type toggle */}
                <div className="flex rounded-xl bg-[#F1F5F9] p-1 border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setImportType("git")}
                    className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      importType === "git" ? "bg-white text-[#2563EB] shadow-xs" : "text-[#64748B]"
                    }`}
                  >
                    Public Git Repository
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportType("zip")}
                    className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      importType === "zip" ? "bg-white text-[#2563EB] shadow-xs" : "text-[#64748B]"
                    }`}
                  >
                    ZIP Archive Upload
                  </button>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#172033] mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    required
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="e.g. backend-api"
                    className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033] focus:border-[#2563EB]"
                  />
                </div>

                {importType === "git" ? (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-[#172033] mb-1">
                        Public Git Clone URL (HTTPS)
                      </label>
                      <input
                        type="url"
                        required
                        value={gitUrl}
                        onChange={(e) => setGitUrl(e.target.value)}
                        placeholder="https://github.com/pallets/flask.git"
                        className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033] focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#172033] mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={gitBranch}
                        onChange={(e) => setGitBranch(e.target.value)}
                        placeholder="main"
                        className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033] focus:border-[#2563EB]"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[13px] font-medium text-[#172033] mb-1">
                      ZIP Archive (.zip, max 50MB)
                    </label>
                    <input
                      type="file"
                      required
                      accept=".zip"
                      onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                      className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033]"
                    />
                  </div>
                )}

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:bg-[#93C5FD]"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Start Ingestion</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
