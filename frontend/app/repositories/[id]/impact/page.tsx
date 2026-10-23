"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Split,
  Search,
  ArrowRight,
  Loader2,
  AlertTriangle,
  FileCode,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Repository, ImpactAnalysisResponse, CodeFileSummary } from "@/lib/types";

export default function ImpactAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const repoId = resolvedParams.id;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [files, setFiles] = useState<CodeFileSummary[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [depth, setDepth] = useState(3);
  const [analyzing, setAnalyzing] = useState(false);
  const [impactData, setImpactData] = useState<ImpactAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        const repo = await api.getRepository(repoId);
        setRepository(repo);

        const fileList = await api.getRepositoryFiles(repoId);
        setFiles(fileList);
        if (fileList.length > 0) {
          setSelectedPath(fileList[0].path);
        }
      } catch {
        // Handled
      }
    }
    loadData();
  }, [repoId, router]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPath) return;

    setAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await api.analyzeImpact(repoId, selectedPath, depth);
      setImpactData(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze change impact.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppShell currentRepo={repository}>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#172033] tracking-tight">
            Change Impact Analysis
          </h1>
          <p className="text-[13px] text-[#64748B]">
            Calculate the blast radius of modifying a target file or module using reverse dependency graph traversal.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                  Select Target File / Module
                </label>
                <select
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] font-mono text-[#172033] focus:border-[#2563EB]"
                >
                  {files.map((f) => (
                    <option key={f.id} value={f.path}>
                      {f.path} ({f.language})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                  Traversal Depth (1–5 hops)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033] focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={analyzing || !selectedPath}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium flex items-center gap-2 transition-colors disabled:bg-[#93C5FD]"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Traversing Graph...</span>
                  </>
                ) : (
                  <>
                    <Split className="w-4 h-4" />
                    <span>Calculate Blast Radius</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {impactData && (
          <div className="space-y-6">
            {/* Limitation Warning */}
            <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-start gap-3 text-[#B45309] text-[13px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{impactData.limitation_warning}</span>
            </div>

            {/* Impact Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  Direct Dependents
                </span>
                <span className="text-[24px] font-semibold text-[#B91C1C]">
                  {impactData.direct_dependents.length}
                </span>
              </div>

              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  Transitive Dependents
                </span>
                <span className="text-[24px] font-semibold text-[#B45309]">
                  {impactData.transitive_dependents.length}
                </span>
              </div>

              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  Affected Tests
                </span>
                <span className="text-[24px] font-semibold text-[#15803D]">
                  {impactData.affected_tests.length}
                </span>
              </div>

              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  Public API Risks
                </span>
                <span className="text-[24px] font-semibold text-[#172033]">
                  {impactData.public_api_risks.length}
                </span>
              </div>
            </div>

            {/* Detailed Nodes List */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">
                Impact Breakdown ({impactData.impact_nodes.length} Affected Modules)
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {impactData.impact_nodes.length > 0 ? (
                  impactData.impact_nodes.map((node, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC]">
                      <div className="flex items-center gap-3">
                        <FileCode className="w-4 h-4 text-[#2563EB]" />
                        <div>
                          <p className="text-[13px] font-mono font-medium text-[#172033]">
                            {node.file_path}
                          </p>
                          <p className="text-[12px] text-[#64748B]">{node.reason}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          node.impact_level === "direct"
                            ? "bg-[#FEE2E2] text-[#B91C1C]"
                            : "bg-[#FEF3C7] text-[#B45309]"
                        }`}
                      >
                        {node.impact_level.toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-8 text-center text-[#64748B] text-[13px]">
                    No inbound dependencies found for this file. It may be a top-level route or an isolated module.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
