"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Copy,
  Check,
  Download,
  Loader2,
  Sparkles,
  AlertCircle,
  FileCode,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CitationChip } from "@/components/chat/CitationChip";
import { Repository, DocumentationResponse, Citation } from "@/lib/types";

export default function DocumentationGeneratorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const repoId = resolvedParams.id;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [docType, setDocType] = useState("readme");
  const [generating, setGenerating] = useState(false);
  const [docResult, setDocResult] = useState<DocumentationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    api.getRepository(repoId).then((r) => {
      setRepository(r);
      if (typeof window !== "undefined" && r?.id) {
        localStorage.setItem("codesage_active_repo_id", r.id);
      }
    }).catch(() => {});
  }, [repoId, router]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.generateDocumentation(repoId, docType);
      setDocResult(res);
    } catch (err: any) {
      alert(err.message || "Failed to generate documentation draft");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!docResult) return;
    navigator.clipboard.writeText(docResult.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!docResult) return;
    const blob = new Blob([docResult.markdown_content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docResult.doc_type}_draft.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell currentRepo={repository}>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#172033] tracking-tight">
            Documentation Generator
          </h1>
          <p className="text-[13px] text-[#64748B]">
            Draft verifiable READMEs, API guides, and architecture explanations grounded in real source code chunks.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-[#172033]">Document Template:</span>
            <div className="flex rounded-xl bg-[#F1F5F9] p-1 border border-[#E2E8F0]">
              {[
                { id: "readme", label: "README.md" },
                { id: "api", label: "API Reference" },
                { id: "architecture", label: "Architecture Overview" },
                { id: "module", label: "Module Summary" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDocType(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                    docType === opt.id ? "bg-white text-[#2563EB] shadow-xs" : "text-[#64748B]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium flex items-center gap-2 transition-colors disabled:bg-[#93C5FD]"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Drafting Documentation...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Draft</span>
              </>
            )}
          </button>
        </div>

        {/* Documentation Draft Result */}
        {docResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <span className="text-[14px] font-semibold text-[#172033]">{docResult.title} (Editable Draft)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:text-[#172033] rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Markdown"}</span>
                </button>
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 text-[12px] font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .md</span>
                </button>
              </div>
            </div>

            {/* Citations bar */}
            {docResult.evidence_citations.length > 0 && (
              <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-xs space-y-2">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  Referenced Code Symbols
                </span>
                <div className="flex flex-wrap gap-2">
                  {docResult.evidence_citations.map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-[12px] font-mono bg-[#F8FAFC] border border-[#E2E8F0] text-[#172033]"
                    >
                      {c.file_path} · {c.symbol_name || "Block"} (L{c.start_line}–{c.end_line})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Editable Markdown Textarea */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
              <textarea
                rows={16}
                value={docResult.markdown_content}
                onChange={(e) =>
                  setDocResult({ ...docResult, markdown_content: e.target.value })
                }
                className="w-full font-mono text-[13px] leading-relaxed p-6 text-[#172033] border-0 focus:ring-0 resize-y"
              />
            </div>
          </div>
        ) : (
          <div className="p-16 bg-white border border-[#E2E8F0] rounded-xl text-center select-none shadow-xs">
            <FileText className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-[16px] font-semibold text-[#172033] mb-1">
              Select a documentation template to begin
            </h3>
            <p className="text-[13px] text-[#64748B] max-w-sm mx-auto">
              CodeSage AI will analyze your codebase symbols, routes, and imports to construct a verifiable draft.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
