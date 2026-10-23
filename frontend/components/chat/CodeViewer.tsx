"use client";

import React, { useEffect, useRef, useState } from "react";
import { FileCode, Copy, Check, ExternalLink, Code } from "lucide-react";

interface CodeViewerProps {
  filePath?: string;
  language?: string;
  code?: string;
  highlightRange?: [number, number] | null; // [startLine, endLine] 1-indexed
  commitSha?: string;
}

export function CodeViewer({
  filePath = "No file selected",
  language = "text",
  code = "",
  highlightRange,
  commitSha,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  const lines = code ? code.split("\n") : [];

  useEffect(() => {
    if (highlightRange && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightRange, code]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white border border-[#E2E8F0] rounded-xl select-none">
        <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] mb-3">
          <Code className="w-6 h-6" />
        </div>
        <h3 className="text-[15px] font-semibold text-[#172033] mb-1">Source Code Viewer</h3>
        <p className="text-[13px] text-[#64748B] max-w-xs">
          Click any verified citation chip in the conversation to inspect its exact source code lines and context.
        </p>
      </div>
    );
  }

  const [hlStart, hlEnd] = highlightRange || [-1, -1];

  return (
    <div className="h-full flex flex-col bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
      {/* File Header */}
      <div className="h-12 bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <FileCode className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span className="text-[13px] font-mono font-medium text-[#172033] truncate">
            {filePath}
          </span>
          {highlightRange && (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              Lines {hlStart}–{hlEnd}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {commitSha && (
            <span className="text-[11px] font-mono text-[#64748B]">
              @{commitSha.slice(0, 7)}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#64748B] hover:text-[#172033] hover:bg-white rounded border border-[#E2E8F0] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Line Stream */}
      <div className="flex-1 overflow-auto font-mono text-[13px] leading-relaxed select-text bg-white">
        <div className="min-w-full inline-block py-2">
          {lines.map((lineText, idx) => {
            const lineNum = idx + 1;
            const isHighlighted = lineNum >= hlStart && lineNum <= hlEnd;
            const isFirstHighlighted = lineNum === hlStart;

            return (
              <div
                key={lineNum}
                ref={isFirstHighlighted ? highlightedRef : null}
                className={`flex items-start px-4 transition-colors ${
                  isHighlighted
                    ? "bg-[#EFF6FF] border-l-2 border-[#2563EB]"
                    : "hover:bg-[#F8FAFC] border-l-2 border-transparent"
                }`}
              >
                {/* Line number gutter */}
                <span className="w-12 shrink-0 select-none text-[12px] text-[#94A3B8] text-right pr-4 font-mono">
                  {lineNum}
                </span>

                {/* Line content */}
                <pre className="flex-1 font-mono text-[#172033] whitespace-pre overflow-visible">
                  {lineText || " "}
                </pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
