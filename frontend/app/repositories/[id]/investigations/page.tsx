"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Bug,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CitationChip } from "@/components/chat/CitationChip";
import { CodeViewer } from "@/components/chat/CodeViewer";
import { Repository, ErrorInvestigationResponse, Citation, CodeFileDetail } from "@/lib/types";

export default function BugInvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const repoId = resolvedParams.id;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [errorTrace, setErrorTrace] = useState("");
  const [investigating, setInvestigating] = useState(false);
  const [result, setResult] = useState<ErrorInvestigationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Code Viewer State
  const [activeFile, setActiveFile] = useState<CodeFileDetail | null>(null);
  const [highlightRange, setHighlightRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    api.getRepository(repoId).then(setRepository).catch(() => {});
  }, [repoId, router]);

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorTrace.trim()) return;

    setInvestigating(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await api.investigateError(repoId, errorTrace);
      setResult(res);
      if (res.evidence_citations.length > 0) {
        handleCitationClick(res.evidence_citations[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Investigation failed.");
    } finally {
      setInvestigating(false);
    }
  };

  const handleCitationClick = async (citation: Citation) => {
    setHighlightRange([citation.start_line, citation.end_line]);
    try {
      const files = await api.getRepositoryFiles(repoId);
      const match = files.find((f) => f.path === citation.file_path);
      if (match) {
        const detail = await api.getFileDetail(repoId, match.id);
        setActiveFile(detail);
      }
    } catch {
      // Handled
    }
  };

  return (
    <AppShell currentRepo={repository}>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#172033] tracking-tight">
            Bug & Stack Trace Investigation
          </h1>
          <p className="text-[13px] text-[#64748B]">
            Paste runtime error logs or tracebacks to map stack frames to indexed repository chunks, diagnose root causes, and inspect suggested fixes.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FEE2E2] text-[#B91C1C] text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <form onSubmit={handleInvestigate} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                Paste Error Log / Stack Trace
              </label>
              <textarea
                required
                rows={5}
                value={errorTrace}
                onChange={(e) => setErrorTrace(e.target.value)}
                placeholder={`Traceback (most recent call last):
  File "app/core/security.py", line 42, in decode_token
    payload = jwt.decode(token, settings.SECRET_KEY)
KeyError: 'sub'`}
                className="w-full font-mono text-[13px] p-3.5 bg-white border border-[#E2E8F0] rounded-xl text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#64748B]">
                Extracts file paths, function symbols, and line ranges to pull surrounding code evidence.
              </span>
              <button
                type="submit"
                disabled={investigating || !errorTrace.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium flex items-center gap-2 transition-colors disabled:bg-[#93C5FD] shadow-xs"
              >
                {investigating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Frames...</span>
                  </>
                ) : (
                  <>
                    <Bug className="w-4 h-4" />
                    <span>Investigate Cause</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Diagnostic Results Grid */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Cause & Fix Recommendations */}
            <div className="space-y-5">
              {/* Error Summary */}
              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs space-y-2">
                <span className="text-[11px] font-semibold text-[#B91C1C] uppercase tracking-wider block">
                  Error Signature
                </span>
                <p className="font-mono text-[14px] font-medium text-[#172033] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                  {result.error_summary}
                </p>
              </div>

              {/* Probable Cause */}
              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs space-y-2">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  Probable Root Cause
                </span>
                <p className="text-[14px] text-[#172033] leading-relaxed">
                  {result.probable_cause}
                </p>
              </div>

              {/* Citations */}
              {result.evidence_citations.length > 0 && (
                <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs space-y-3">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Correlated Source Code Evidence
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.evidence_citations.map((c, i) => (
                      <CitationChip
                        key={i}
                        citation={c}
                        onClick={handleCitationClick}
                        active={highlightRange?.[0] === c.start_line}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Fix */}
              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs space-y-2">
                <span className="text-[11px] font-semibold text-[#15803D] uppercase tracking-wider block">
                  Suggested Fix Strategy
                </span>
                <p className="text-[14px] text-[#172033] leading-relaxed">
                  {result.suggested_fix}
                </p>
              </div>

              {/* Tests to Consider */}
              <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-xs space-y-2">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  Regression Tests to Consider
                </span>
                <ul className="space-y-1.5 list-disc pl-5 text-[13px] text-[#172033]">
                  {result.tests_to_consider.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>

              {result.uncertainty_notes && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#64748B]">
                  <strong>Uncertainty Note:</strong> {result.uncertainty_notes}
                </div>
              )}
            </div>

            {/* Right: Code Viewer */}
            <div className="h-[600px]">
              <CodeViewer
                filePath={activeFile?.path || "Select an evidence citation"}
                language={activeFile?.language || "text"}
                code={activeFile?.content || ""}
                highlightRange={highlightRange}
                commitSha={repository?.commit_sha}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
