"use client";

import React from "react";
import { Split } from "lucide-react";
import { RepoFeatureRedirect } from "@/components/repositories/RepoFeatureRedirect";

export default function StaticRepositoriesAnalysisPage() {
  return (
    <RepoFeatureRedirect
      feature="impact"
      title="Change Impact Analysis"
      description="Estimate regression risk and direct/indirect blast radius for modified files."
      icon={Split}
    />
  );
}
