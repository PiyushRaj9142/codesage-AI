/**
 * CodeSage AI Shared TypeScript Types
 */

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  role: "owner" | "editor" | "viewer";
  repositories_count: number;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  workspace_id: string;
  name: string;
  source_url?: string;
  source_type: "git" | "zip";
  branch?: string;
  commit_sha?: string;
  status: "pending" | "cloning" | "filtering" | "parsing" | "embedding" | "ready" | "failed";
  error_message?: string;
  file_count: number;
  chunk_count: number;
  primary_language?: string;
  created_at: string;
  updated_at: string;
}

export interface RepositoryStatus {
  repository_id: string;
  status: string;
  stage: string;
  progress: number;
  error_code?: string;
  safe_error_message?: string;
  file_count: number;
  chunk_count: number;
}

export interface CodeFileSummary {
  id: string;
  path: string;
  language: string;
  file_size: number;
  chunk_count: number;
}

export interface CodeFileDetail {
  id: string;
  repository_id: string;
  path: string;
  language: string;
  commit_sha?: string;
  file_size: number;
  content?: string;
}

export interface Citation {
  id?: string;
  chunk_id?: string;
  file_path: string;
  symbol_name?: string;
  start_line: number;
  end_line: number;
  relevance_score: number;
  citation_label?: string; // E1, E2...
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  insufficient_evidence: boolean;
  citations: Citation[];
  created_at: string;
}

export interface Conversation {
  id: string;
  repository_id: string;
  title: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface DependencyNode {
  id: string;
  path: string;
  language: string;
  file_size: number;
  inbound_count: number;
  outbound_count: number;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  import_symbol?: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  languages: string[];
  total_files: number;
  total_dependencies: number;
}

export interface ErrorInvestigationResponse {
  error_summary: string;
  probable_cause: string;
  evidence_citations: Citation[];
  suggested_fix: string;
  tests_to_consider: string[];
  uncertainty_notes?: string;
}

export interface ImpactNode {
  file_path: string;
  impact_level: "direct" | "transitive" | "test";
  reason: string;
}

export interface ImpactAnalysisResponse {
  target_path: string;
  direct_dependents: string[];
  transitive_dependents: string[];
  affected_tests: string[];
  public_api_risks: string[];
  impact_nodes: ImpactNode[];
  limitation_warning: string;
}

export interface DocumentationResponse {
  doc_type: string;
  title: string;
  markdown_content: string;
  evidence_citations: Citation[];
  is_draft: boolean;
}

export interface EvaluationItemResult {
  item_id: string;
  question: string;
  category: string;
  is_hit_at_5: boolean;
  reciprocal_rank: number;
  citation_valid: boolean;
  latency_ms: number;
  generated_answer?: string;
}

export interface EvaluationRun {
  id: string;
  dataset_id: string;
  repository_id: string;
  configuration_name: string;
  status: string;
  recall_at_5: number;
  mrr: number;
  citation_accuracy: number;
  abstention_accuracy: number;
  latency_ms: number;
  total_questions: number;
  answered_questions: number;
  created_at: string;
  results: EvaluationItemResult[];
}

export interface EvaluationDataset {
  id: string;
  name: string;
  description?: string;
  item_count: number;
  created_at: string;
}

export interface OverviewDashboardData {
  summary: {
    total_workspaces: number;
    total_repositories: number;
    indexed_repositories: number;
    jobs_in_progress: number;
    recent_evaluations_count: number;
  };
  recent_repositories: Repository[];
  recent_activity: Array<{
    id: string;
    type: string;
    title: string;
    timestamp: string;
    details: string;
  }>;
  recent_evaluations: Array<{
    id: string;
    configuration_name: string;
    recall_at_5: number;
    mrr: number;
    latency_ms: number;
    created_at: string;
  }>;
}
