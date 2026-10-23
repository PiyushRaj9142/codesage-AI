"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Save, Check, Key, Cpu, Database, Shield } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPage() {
  const router = useRouter();
  const [llmProvider, setLlmProvider] = useState("mock");
  const [apiKey, setApiKey] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#172033] tracking-tight">
            System & Provider Settings
          </h1>
          <p className="text-[13px] text-[#64748B]">
            Configure AI model providers, embeddings, and vector database connection parameters.
          </p>
        </div>

        {saved && (
          <div className="p-4 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-[13px] flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* AI Provider Config */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <Cpu className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-[15px] font-semibold text-[#172033]">
                AI Model & Inference Provider
              </h2>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                Active LLM Provider
              </label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033] focus:border-[#2563EB]"
              >
                <option value="mock">Deterministic Mock Provider (Offline / Testing / Zero API keys)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Local Ollama (Self-hosted)</option>
              </select>
              <p className="mt-1 text-[12px] text-[#64748B]">
                {llmProvider === "mock"
                  ? "Uses deterministic offline responses directly grounded on retrieved code blocks without making external network calls."
                  : "Requires server-side API credentials to stream live completions."}
              </p>
            </div>

            {llmProvider !== "mock" && (
              <div>
                <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                  Server API Key / Token
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-••••••••••••••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] font-mono text-[#172033] focus:border-[#2563EB]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Retrieval & Vector Settings */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <Database className="w-5 h-5 text-[#0F766E]" />
              <h2 className="text-[15px] font-semibold text-[#172033]">
                Embeddings & Hybrid Retrieval Parameters
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                  Embedding Model
                </label>
                <input
                  type="text"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033] focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#172033] mb-1.5">
                  RRF Constant (k)
                </label>
                <input
                  type="number"
                  defaultValue={60}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033] focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
