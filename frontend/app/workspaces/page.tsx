"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Trash2,
  GitBranch,
  Users,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Workspace } from "@/lib/types";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWsName, setNewWsName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    async function loadWorkspaces() {
      try {
        const list = await api.getWorkspaces();
        setWorkspaces(list);
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaces();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreating(true);

    try {
      const created = await api.createWorkspace(newWsName.trim());
      setWorkspaces((prev) => [...prev, created]);
      setNewWsName("");
    } catch (err: any) {
      alert(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (wsId: string) => {
    if (!confirm("Are you sure you want to delete this workspace and its repositories?")) return;
    try {
      await api.deleteWorkspace(wsId);
      setWorkspaces((prev) => prev.filter((w) => w.id !== wsId));
    } catch (err: any) {
      alert(err.message || "Failed to delete workspace");
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#172033] tracking-tight">
            Workspaces
          </h1>
          <p className="text-[13px] text-[#64748B]">
            Organize codebases, collaborate across engineering teams, and enforce role-based access.
          </p>
        </div>

        {/* Create Workspace Form */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              required
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="New workspace name (e.g. Infrastructure, Core Services)"
              className="flex-1 px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB]"
            />
            <button
              type="submit"
              disabled={creating || !newWsName.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:bg-[#93C5FD]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </form>
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="p-6 bg-white border border-[#E2E8F0] rounded-xl shadow-xs flex flex-col justify-between hover:border-[#2563EB] transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-medium uppercase bg-[#F1F5F9] text-[#64748B]">
                    {ws.role}
                  </span>
                </div>

                <h3 className="text-[16px] font-semibold text-[#172033] mb-1">
                  {ws.name}
                </h3>
                <p className="text-[12px] text-[#64748B] mb-4">
                  Created {new Date(ws.created_at).toLocaleDateString()}
                </p>

                <div className="flex items-center gap-4 text-[12px] text-[#64748B] py-3 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-[#94A3B8]" />
                    <span>{ws.repositories_count} repos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#94A3B8]" />
                    <span>{ws.members_count} members</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <Link
                  href="/repositories"
                  className="text-[13px] font-medium text-[#2563EB] hover:underline"
                >
                  Manage Repositories →
                </Link>

                {ws.role === "owner" && (
                  <button
                    onClick={() => handleDelete(ws.id)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#B91C1C] rounded transition-colors"
                    title="Delete workspace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
