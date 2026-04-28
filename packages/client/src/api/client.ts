import { useAuth } from "@clerk/react";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  developerName: string;
  developerContext: string;
  stack: string;
  stage: number;
  repoUrl: string;
  repoPath: string;
  deploymentTarget: string;
  testCommand: string;
  architecture: string;
  currentState: string;
  environment: string;
  constraints: string;
  codeStandards: string;
  createdAt: number;
  updatedAt: number;
}

export interface Document {
  id: string;
  projectId: string;
  type: string;
  content: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  objectives: string;
  gateCriteria: string;
  status: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface PhaseReport {
  id: string;
  phaseId: string;
  projectId: string;
  verdict: "GO" | "NO-GO" | "CONDITIONAL";
  report: string; // JSON string
  createdAt: number;
}

export interface LLMSettings {
  provider: "anthropic" | "openai" | "custom" | null;
  baseUrl: string | null;
  model: string | null;
  hasKey: boolean;
  knownModels: { anthropic: string[]; openai: string[] };
  defaultBaseUrls: Record<string, string>;
}

export interface ConversationSession {
  id: string;
  sessionIndex: number;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationDetail {
  id: string;
  projectId: string;
  stage: number;
  sessionIndex: number;
  title: string;
  messages: { role: string; content: string; timestamp: number }[];
  createdAt: number;
  updatedAt: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns a typed API client with Clerk auth token injected on every request.
 * Must be called inside a React component or hook.
 */
export function useApiClient() {
  const { getToken } = useAuth();

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error((error as { error?: string }).error ?? `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    projects: {
      list: () => request<Project[]>("/projects"),
      get: (id: string) => request<Project>(`/projects/${id}`),
      create: (
        data: Omit<Project, "id" | "createdAt" | "updatedAt"> & {
          phases?: { name: string; goal: string; objectives: string; gateCriteria: string }[];
        }
      ) => request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Project>) =>
        request<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    },
    documents: {
      list: (projectId: string) => request<Document[]>(`/documents/${projectId}`),
      get: (projectId: string, type: string) =>
        request<Document>(`/documents/${projectId}/${type}`),
      upsert: (projectId: string, type: string, content: string) =>
        request<Document>(`/documents/${projectId}/${type}`, {
          method: "PUT",
          body: JSON.stringify({ content }),
        }),
    },
    phases: {
      list: (projectId: string) => request<Phase[]>(`/phases/${projectId}`),
      getActive: (projectId: string) => request<Phase>(`/phases/${projectId}/active`),
      create: (
        projectId: string,
        data: Omit<Phase, "id" | "projectId" | "createdAt" | "updatedAt">
      ) =>
        request<Phase>(`/phases/${projectId}`, { method: "POST", body: JSON.stringify(data) }),
      update: (projectId: string, id: string, data: Partial<Phase>) =>
        request<Phase>(`/phases/${projectId}/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      listReports: (projectId: string, phaseId: string) =>
        request<PhaseReport[]>(`/phases/${projectId}/${phaseId}/reports`),
      createReport: (
        projectId: string,
        phaseId: string,
        data: { verdict: "GO" | "NO-GO" | "CONDITIONAL"; report: Record<string, unknown> }
      ) =>
        request<PhaseReport>(`/phases/${projectId}/${phaseId}/reports`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    health: {
      check: () => request<{ status: string; timestamp: string }>("/health"),
    },
    settings: {
      get: () => request<LLMSettings>("/settings"),
      save: (data: { provider: string; baseUrl: string; apiKey: string; model: string }) =>
        request<Omit<LLMSettings, "knownModels" | "defaultBaseUrls">>("/settings", {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      validate: () => request<{ valid: boolean }>("/settings/validate", { method: "POST" }),
    },
    chat: {
      start: (projectId: string, stage: number) =>
        request<{ conversationId: string; sessionIndex: number }>("/chat/start", {
          method: "POST",
          body: JSON.stringify({ projectId, stage }),
        }),
      listSessions: (projectId: string, stage: number) =>
        request<ConversationSession[]>(`/chat/${projectId}/${stage}`),
      getConversation: (id: string) =>
        request<ConversationDetail>(`/chat/conversation/${id}`),
    },
  };
}
