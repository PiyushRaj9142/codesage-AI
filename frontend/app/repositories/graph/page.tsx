"use client";

import React from "react";
import { Network } from "lucide-react";
import { RepoFeatureRedirect } from "@/components/repositories/RepoFeatureRedirect";

export default function StaticRepositoriesGraphPage() {
  return (
    <RepoFeatureRedirect
      feature="graph"
      title="Architecture Explorer"
      description="Interactive module dependency graph and import relationships."
      icon={Network}
    />
  );
}
