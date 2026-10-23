"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Square, CornerDownLeft } from "lucide-react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}

export function ChatComposer({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  disabledMessage,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming || disabled) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-[#E2E8F0] bg-white p-4">
      {disabled && disabledMessage && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-[#FEF3C7] text-[#B45309] text-[12px] font-medium flex items-center gap-2">
          <span>{disabledMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          rows={1}
          placeholder={
            disabled
              ? "Repository is currently indexing..."
              : "Ask a repository question (e.g. 'Where is authentication middleware defined?'). Enter to send..."
          }
          className="flex-1 max-h-44 resize-none rounded-xl border border-[#E2E8F0] px-4 py-3 text-[14px] text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed leading-relaxed transition-all"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="h-11 px-4 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            aria-label="Send message"
            className="h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#CBD5E1] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors shrink-0 disabled:cursor-not-allowed shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        )}
      </form>
    </div>
  );
}
