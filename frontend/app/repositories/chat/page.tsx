"use client";

import React from "react";
import { MessageSquareCode } from "lucide-react";
import { RepoFeatureRedirect } from "@/components/repositories/RepoFeatureRedirect";

export default function StaticRepositoriesChatPage() {
  return (
    <RepoFeatureRedirect
      feature="chat"
      title="Grounded AI Chat"
      description="Ask questions about unfamiliar codebases with exact file and line citations."
      icon={MessageSquareCode}
    />
  );
}
