"use client";

import React from "react";
import { FileText } from "lucide-react";
import { RepoFeatureRedirect } from "@/components/repositories/RepoFeatureRedirect";

export default function StaticRepositoriesDocumentationPage() {
  return (
    <RepoFeatureRedirect
      feature="documentation"
      title="Documentation Generator"
      description="Synthesize architecture overviews, module guides, and grounded API references."
      icon={FileText}
    />
  );
}
