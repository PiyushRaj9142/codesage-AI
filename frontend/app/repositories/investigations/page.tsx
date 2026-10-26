"use client";

import React from "react";
import { Bug } from "lucide-react";
import { RepoFeatureRedirect } from "@/components/repositories/RepoFeatureRedirect";

export default function StaticRepositoriesInvestigationsPage() {
  return (
    <RepoFeatureRedirect
      feature="investigations"
      title="Bug & Error Investigation"
      description="Trace stack traces and runtime exceptions to suspect root-cause files."
      icon={Bug}
    />
  );
}
