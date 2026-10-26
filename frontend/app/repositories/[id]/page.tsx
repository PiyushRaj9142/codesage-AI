"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function RepositoryRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const repoId = resolvedParams.id;

  useEffect(() => {
    if (repoId) {
      if (typeof window !== "undefined") {
        localStorage.setItem("codesage_active_repo_id", repoId);
      }
      router.replace(`/repositories/${repoId}/chat`);
    }
  }, [repoId, router]);

  return (
    <AppShell>
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mb-4" />
        <p className="text-[14px] text-[#64748B]">Loading repository workbench...</p>
      </div>
    </AppShell>
  );
}
