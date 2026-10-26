"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Repository, EvaluationDataset, EvaluationRun } from "@/lib/types";

export default function EvaluationDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const repoId = resolvedParams.id;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [datasets, setDatasets] = useState<EvaluationDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [configuration, setConfiguration] = useState("hybrid_rrf");
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [activeRun, setActiveRun] = useState<EvaluationRun | null>(null);
  const [running, setRunning] = useState(false);
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
        if (typeof window !== "undefined" && repo?.id) {
          localStorage.setItem("codesage_active_repo_id", repo.id);
        }

        const dsList = await api.getEvaluationDatasets();
        setDatasets(dsList);
        if (dsList.length > 0) {
          setSelectedDatasetId(dsList[0].id);
        }

        const runList = await api.getEvaluationRuns(repoId);
        setRuns(runList);
        if (runList.length > 0) {
          const detail = await api.getEvaluationRun(runList[0].id);
          setActiveRun(detail);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load evaluation data.");
      }
    }
    loadData();
  }, [repoId, router]);

  const handleRunEvaluation = async () => {
    if (!selectedDatasetId) return;
    setRunning(true);
    setErrorMsg(null);

    try {
      const runRes = await api.runEvaluation(selectedDatasetId, repoId, configuration);
      setActiveRun(runRes);
      const updatedRuns = await api.getEvaluationRuns(repoId);
      setRuns(updatedRuns);
    } catch (err: any) {
      setErrorMsg(err.message || "Evaluation run failed.");
    } finally {
      setRunning(false);
    }
  };

  const handleSelectRun = async (runId: string) => {
    try {
      const detail = await api.getEvaluationRun(runId);
      setActiveRun(detail);
    } catch {
      // Handled
    }
  };

  return (
    <AppShell currentRepo={repository}>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#172033] tracking-tight">
            RAG Evaluation & Benchmark Dashboard
          </h1>
          <p className="text-[13px] text-[#64748B]">
            Empirical measurements of Recall@5, Mean Reciprocal Rank (MRR), and Citation Accuracy across hybrid retrieval algorithms.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FEE2E2] text-[#B91C1C] text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Evaluation Control Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                Dataset
              </label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#172033] py-1.5 px-3 focus:border-[#2563EB]"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.item_count} items)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                Retrieval Experiment
              </label>
              <select
                value={configuration}
                onChange={(e) => setConfiguration(e.target.value)}
                className="bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#172033] py-1.5 px-3 focus:border-[#2563EB]"
              >
                <option value="hybrid_rrf">Hybrid RRF (Vector + Keyword, k=60)</option>
                <option value="hybrid_rerank">Hybrid RRF + Symbol Match Boost</option>
                <option value="vector_only">Vector Only (Dense Cosine Similarity)</option>
                <option value="keyword_only">Keyword Only (Lexical & Symbol Matching)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={running || !selectedDatasetId}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium flex items-center gap-2 transition-colors disabled:bg-[#93C5FD] shadow-xs"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Test Benchmark...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Evaluation</span>
              </>
            )}
          </button>
        </div>

        {/* Real Metrics Cards */}
        {activeRun ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  Recall@5
                </span>
                <div className="text-[28px] font-semibold text-[#15803D]">
                  {(activeRun.recall_at_5 * 100).toFixed(1)}%
                </div>
                <span className="text-[11px] text-[#64748B]">Target chunk in top 5</span>
              </div>

              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  MRR (Mean Reciprocal Rank)
                </span>
                <div className="text-[28px] font-semibold text-[#2563EB]">
                  {activeRun.mrr.toFixed(3)}
                </div>
                <span className="text-[11px] text-[#64748B]">First hit rank reciprocal</span>
              </div>

              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  Citation Accuracy
                </span>
                <div className="text-[28px] font-semibold text-[#0F766E]">
                  {(activeRun.citation_accuracy * 100).toFixed(1)}%
                </div>
                <span className="text-[11px] text-[#64748B]">Verified line-grounded</span>
              </div>

              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  Abstention Accuracy
                </span>
                <div className="text-[28px] font-semibold text-[#172033]">
                  {(activeRun.abstention_accuracy * 100).toFixed(1)}%
                </div>
                <span className="text-[11px] text-[#64748B]">Zero hallucination rate</span>
              </div>

              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
                  Average Latency
                </span>
                <div className="text-[28px] font-semibold text-[#172033]">
                  {activeRun.latency_ms.toFixed(0)} ms
                </div>
                <span className="text-[11px] text-[#64748B]">End-to-end retrieval</span>
              </div>
            </div>

            {/* Per-Question Audit Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Question-Level Benchmark Audit ({activeRun.results?.length || 0} Questions)
                </span>
                <span className="text-[12px] font-mono text-[#64748B]">
                  Config: {activeRun.configuration_name}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-medium text-[12px]">
                    <tr>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Evaluation Question</th>
                      <th className="p-3.5">Hit@5</th>
                      <th className="p-3.5">Reciprocal Rank</th>
                      <th className="p-3.5">Citation Verified</th>
                      <th className="p-3.5">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {activeRun.results?.map((res, i) => (
                      <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] text-[#64748B] uppercase">
                            {res.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-[#172033] max-w-md">
                          {res.question}
                        </td>
                        <td className="p-3.5">
                          {res.is_hit_at_5 ? (
                            <span className="text-[#15803D] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Hit
                            </span>
                          ) : (
                            <span className="text-[#B45309] flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" /> Miss
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[#172033]">
                          {res.reciprocal_rank > 0 ? res.reciprocal_rank.toFixed(3) : "—"}
                        </td>
                        <td className="p-3.5">
                          {res.citation_valid ? (
                            <span className="text-[#15803D] font-medium">Valid</span>
                          ) : (
                            <span className="text-[#64748B]">N/A</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[#64748B]">
                          {res.latency_ms.toFixed(0)} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-16 bg-white border border-[#E2E8F0] rounded-xl text-center shadow-xs">
            <BarChart3 className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-[16px] font-semibold text-[#172033] mb-1">
              No Evaluation Results Yet
            </h3>
            <p className="text-[13px] text-[#64748B] max-w-sm mx-auto mb-4">
              Run an empirical benchmark above to evaluate Recall@5, MRR, and citation accuracy on real queries.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
