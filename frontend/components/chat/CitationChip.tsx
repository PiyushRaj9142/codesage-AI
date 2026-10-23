"use client";

import React from "react";
import { FileCode, ArrowUpRight } from "lucide-react";
import { Citation } from "@/lib/types";

interface CitationChipProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
  active?: boolean;
}

export function CitationChip({ citation, onClick, active = false }: CitationChipProps) {
  const fileName = citation.file_path.split("/").pop() || citation.file_path;

  return (
    <button
      onClick={() => onClick(citation)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-mono transition-all border ${
        active
          ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] shadow-xs"
          : "bg-white border-[#E2E8F0] text-[#172033] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
      }`}
      title={`${citation.file_path} (Lines ${citation.start_line}-${citation.end_line})`}
    >
      <FileCode className="w-3.5 h-3.5 text-[#2563EB]" />
      <span className="font-semibold text-[#2563EB]">
        {citation.citation_label ? `[${citation.citation_label}]` : ""}
      </span>
      <span className="truncate max-w-[140px] text-[#172033] font-medium">
        {fileName}
      </span>
      <span className="text-[#64748B]">
        L{citation.start_line}–{citation.end_line}
      </span>
      <ArrowUpRight className="w-3 h-3 text-[#94A3B8]" />
    </button>
  );
}
