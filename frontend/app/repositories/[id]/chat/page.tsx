"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Trash2,
  AlertCircle,
  FileCode,
  Sparkles,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CodeViewer } from "@/components/chat/CodeViewer";
import { CitationChip } from "@/components/chat/CitationChip";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { streamChatResponse } from "@/lib/sse";
import { Repository, Conversation, Message, Citation, CodeFileDetail } from "@/lib/types";

export default function RepositoryChatPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const repoId = resolvedParams.id;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingToken, setStreamingToken] = useState("");
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Code Viewer State
  const [activeFile, setActiveFile] = useState<CodeFileDetail | null>(null);
  const [highlightRange, setHighlightRange] = useState<[number, number] | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Load Repository & Conversations
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    async function loadRepoChat() {
      try {
        const repo = await api.getRepository(repoId);
        setRepository(repo);
        if (typeof window !== "undefined" && repo?.id) {
          localStorage.setItem("codesage_active_repo_id", repo.id);
        }

        const convList = await api.getConversations(repoId);
        setConversations(convList);

        if (convList.length > 0) {
          const first = convList[0];
          setActiveConversationId(first.id);
          const detail = await api.getConversation(first.id);
          setMessages(detail.messages || []);
        }
      } catch (err) {
        // Handled
      } finally {
        setLoading(false);
      }
    }
    loadRepoChat();
  }, [repoId, router]);

  const selectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    try {
      const detail = await api.getConversation(convId);
      setMessages(detail.messages || []);
    } catch {
      // Handled
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setHighlightRange(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        handleNewChat();
      }
    } catch {
      // Handled
    }
  };

  const handleSend = async (question: string) => {
    if (isStreaming) return;

    // Optimistically append user message
    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      conversation_id: activeConversationId || "temp",
      role: "user",
      content: question,
      insufficient_evidence: false,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setStreamingToken("");
    setStreamStatus("Retrieving relevant code chunks via Hybrid RRF...");

    const controller = new AbortController();
    setAbortController(controller);

    await streamChatResponse(
      repoId,
      question,
      activeConversationId,
      {
        onStatus: (status) => {
          setStreamStatus(
            status === "retrieving"
              ? "Retrieving source chunks using Reciprocal Rank Fusion..."
              : "Generating evidence-grounded answer..."
          );
        },
        onDelta: (token) => {
          setStreamingToken((prev) => prev + token);
        },
        onComplete: (data) => {
          setIsStreaming(false);
          setStreamingToken("");
          setStreamStatus(null);
          setActiveConversationId(data.conversation_id);

          // Append assistant message with validated citations
          const assistantMsg: Message = {
            id: data.message_id,
            conversation_id: data.conversation_id,
            role: "assistant",
            content: streamingToken,
            insufficient_evidence: data.insufficient_evidence,
            citations: data.citations || [],
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // Refresh conversations
          api.getConversations(repoId).then(setConversations).catch(() => {});
        },
        onError: (err) => {
          setIsStreaming(false);
          setStreamStatus(null);
          alert(`Chat error: ${err}`);
        },
      },
      controller.signal
    );
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setStreamStatus(null);
    }
  };

  const handleCitationClick = async (citation: Citation) => {
    setActiveCitation(citation);
    setHighlightRange([citation.start_line, citation.end_line]);

    try {
      // Find code file by path
      const files = await api.getRepositoryFiles(repoId);
      const match = files.find((f) => f.path === citation.file_path);
      if (match) {
        const fileDetail = await api.getFileDetail(repoId, match.id);
        setActiveFile(fileDetail);
      }
    } catch {
      // Handled
    }
  };

  const isIndexing = repository?.status && repository.status !== "ready";

  if (!loading && !repository) {
    return (
      <AppShell>
        <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 select-none max-w-md mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold text-[#172033]">Repository Not Found</h2>
            <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
              The requested repository could not be found or has not been indexed yet.
            </p>
          </div>
          <Link
            href="/repositories"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium shadow-xs"
          >
            <span>Return to Repositories</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentRepo={repository}>
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
        {/* Leftmost: Conversation History (collapsible/fixed) */}
        <div className="w-60 bg-white border-r border-[#E2E8F0] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#E2E8F0]">
            <button
              onClick={handleNewChat}
              className="w-full py-2 px-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#172033] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#2563EB]" />
              <span>New Conversation</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Recent Chats
            </div>
            {conversations.length > 0 ? (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`group flex items-center justify-between p-2 rounded-lg text-[13px] cursor-pointer transition-colors ${
                    activeConversationId === c.id
                      ? "bg-[#EFF6FF] text-[#2563EB] font-medium"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#172033]"
                  }`}
                >
                  <span className="truncate">{c.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-[#B91C1C]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="p-3 text-[12px] text-[#94A3B8] text-center">No chat history</p>
            )}
          </div>
        </div>

        {/* Center: Conversation Stream */}
        <div className="flex-1 flex flex-col bg-white border-r border-[#E2E8F0] min-w-0">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && !isStreaming ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
                <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#172033] mb-1">
                  Ask CodeSage AI
                </h3>
                <p className="text-[13px] text-[#64748B] max-w-sm mb-6">
                  Ask natural-language questions about {repository?.name || "this repository"}.
                  Every answer provides verifiable file citations and exact line numbers.
                </p>
                <div className="flex flex-col gap-2 text-left max-w-sm w-full">
                  <button
                    onClick={() => handleSend("Where is authentication or token verification implemented?")}
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] text-[13px] text-[#172033] text-left transition-colors"
                  >
                    &ldquo;Where is authentication or token verification implemented?&rdquo;
                  </button>
                  <button
                    onClick={() => handleSend("Explain the overall architecture and main entrypoints.")}
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] text-[13px] text-[#172033] text-left transition-colors"
                  >
                    &ldquo;Explain the overall architecture and main entrypoints.&rdquo;
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3.5 max-w-3xl ${
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${
                        msg.role === "user" ? "bg-[#172033]" : "bg-[#2563EB]"
                      }`}
                    >
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-[14px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#2563EB] text-white"
                          : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#172033]"
                      }`}
                    >
                      {/* Message Content */}
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Insufficient Evidence Warning Banner */}
                      {msg.insufficient_evidence && (
                        <div className="mt-3 p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] text-[12px] flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            Notice: Insufficient source evidence was found in the indexed repository to answer this query definitively without hallucination.
                          </span>
                        </div>
                      )}

                      {/* Verified Citations List */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-2">
                          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                            Verified Source Citations ({msg.citations.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((c, i) => (
                              <CitationChip
                                key={i}
                                citation={c}
                                active={activeCitation?.chunk_id === c.chunk_id}
                                onClick={handleCitationClick}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming Assistant In-flight Bubble */}
                {isStreaming && (
                  <div className="flex items-start gap-3.5 max-w-3xl mr-auto">
                    <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#172033] text-[14px] leading-relaxed space-y-2">
                      {streamStatus && (
                        <div className="flex items-center gap-2 text-[12px] text-[#2563EB] font-medium pb-2 border-b border-[#E2E8F0]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{streamStatus}</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{streamingToken || "Thinking..."}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Composer */}
          <ChatComposer
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
            disabled={Boolean(isIndexing)}
            disabledMessage={
              isIndexing ? `Repository indexing is in progress (${repository?.status}). Questions will be enabled once indexing completes.` : undefined
            }
          />
        </div>

        {/* Right: Source Code Viewer */}
        <div className="w-[45%] h-full p-4 bg-[#F8FAFC] shrink-0 hidden lg:block">
          <CodeViewer
            filePath={activeFile?.path || activeCitation?.file_path}
            language={activeFile?.language || "text"}
            code={activeFile?.content || ""}
            highlightRange={highlightRange}
            commitSha={repository?.commit_sha}
          />
        </div>
      </div>
    </AppShell>
  );
}
