/**
 * Typed API Client for CodeSage AI Backend
 */
import { getAuthToken, clearAuth } from "./auth";
import {
  AuthResponse,
  Workspace,
  Repository,
  RepositoryStatus,
  CodeFileSummary,
  CodeFileDetail,
  DependencyGraph,
  Conversation,
  ErrorInvestigationResponse,
  ImpactAnalysisResponse,
  DocumentationResponse,
  EvaluationDataset,
  EvaluationRun,
  OverviewDashboardData,
  User
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearAuth();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    if (!response.ok) {
      let errorMsg = `API request failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {
        // Fallback to text
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  // --- Workspaces ---
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("/workspaces");
  }

  async createWorkspace(name: string): Promise<Workspace> {
    return this.request<Workspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async updateWorkspace(id: string, name: string): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.request<void>(`/workspaces/${id}`, { method: "DELETE" });
  }

  // --- Repositories ---
  async getRepositories(workspaceId?: string): Promise<Repository[]> {
    const query = workspaceId ? `?workspace_id=${workspaceId}` : "";
    return this.request<Repository[]>(`/repositories${query}`);
  }

  async importGitRepository(workspaceId: string, name: string, sourceUrl: string, branch: string = "main"): Promise<Repository> {
    return this.request<Repository>("/repositories/git", {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, name, source_url: sourceUrl, branch }),
    });
  }

  async uploadZipRepository(workspaceId: string, name: string, file: File): Promise<Repository> {
    const formData = new FormData();
    formData.append("workspace_id", workspaceId);
    formData.append("name", name);
    formData.append("file", file);

    return this.request<Repository>("/repositories/zip", {
      method: "POST",
      body: formData,
    });
  }

  async getRepository(id: string): Promise<Repository> {
    return this.request<Repository>(`/repositories/${id}`);
  }

  async triggerIndexing(id: string): Promise<RepositoryStatus> {
    return this.request<RepositoryStatus>(`/repositories/${id}/index`, { method: "POST" });
  }

  async getRepositoryStatus(id: string): Promise<RepositoryStatus> {
    return this.request<RepositoryStatus>(`/repositories/${id}/status`);
  }

  async getRepositoryFiles(id: string): Promise<CodeFileSummary[]> {
    return this.request<CodeFileSummary[]>(`/repositories/${id}/files`);
  }

  async getFileDetail(repoId: string, fileId: string): Promise<CodeFileDetail> {
    return this.request<CodeFileDetail>(`/repositories/${repoId}/files/${fileId}`);
  }

  async getDependencyGraph(id: string): Promise<DependencyGraph> {
    return this.request<DependencyGraph>(`/repositories/${id}/dependencies`);
  }

  async deleteRepository(id: string): Promise<void> {
    await this.request<void>(`/repositories/${id}`, { method: "DELETE" });
  }

  // --- Chat & History ---
  async getConversations(repositoryId: string): Promise<Conversation[]> {
    return this.request<Conversation[]>(`/chat/conversations?repository_id=${repositoryId}`);
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.request<Conversation>(`/chat/conversations/${id}`);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.request<void>(`/chat/conversations/${id}`, { method: "DELETE" });
  }

  // --- Developer Intelligence Analysis ---
  async investigateError(repositoryId: string, errorTrace: string): Promise<ErrorInvestigationResponse> {
    return this.request<ErrorInvestigationResponse>("/analysis/error", {
      method: "POST",
      body: JSON.stringify({ repository_id: repositoryId, error_trace: errorTrace }),
    });
  }

  async analyzeImpact(repositoryId: string, targetPath: string, maxDepth: number = 3): Promise<ImpactAnalysisResponse> {
    return this.request<ImpactAnalysisResponse>("/analysis/impact", {
      method: "POST",
      body: JSON.stringify({ repository_id: repositoryId, target_path: targetPath, max_depth: maxDepth }),
    });
  }

  async generateDocumentation(repositoryId: string, docType: string): Promise<DocumentationResponse> {
    return this.request<DocumentationResponse>("/analysis/docs/generate", {
      method: "POST",
      body: JSON.stringify({ repository_id: repositoryId, doc_type: docType }),
    });
  }

  // --- Evaluations ---
  async getEvaluationDatasets(): Promise<EvaluationDataset[]> {
    return this.request<EvaluationDataset[]>("/evaluations/datasets");
  }

  async runEvaluation(datasetId: string, repositoryId: string, configurationName: string): Promise<EvaluationRun> {
    return this.request<EvaluationRun>("/evaluations", {
      method: "POST",
      body: JSON.stringify({
        dataset_id: datasetId,
        repository_id: repositoryId,
        configuration_name: configurationName,
      }),
    });
  }

  async getEvaluationRuns(repositoryId?: string): Promise<EvaluationRun[]> {
    const query = repositoryId ? `?repository_id=${repositoryId}` : "";
    return this.request<EvaluationRun[]>(`/evaluations${query}`);
  }

  async getEvaluationRun(id: string): Promise<EvaluationRun> {
    return this.request<EvaluationRun>(`/evaluations/${id}`);
  }

  // --- Overview ---
  async getOverview(): Promise<OverviewDashboardData> {
    return this.request<OverviewDashboardData>("/overview");
  }
}

export const api = new ApiClient();
