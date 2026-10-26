"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import { RepoFeatureRedirect } from "@/components/repositories/RepoFeatureRedirect";

export default function StaticRepositoriesEvaluationsPage() {
  return (
    <RepoFeatureRedirect
      feature="evaluations"
      title="RAG Evaluation & Benchmarking"
      description="Benchmark hybrid retrieval against gold-standard QA datasets using Recall@5 and MRR."
      icon={BarChart3}
    />
  );
}
