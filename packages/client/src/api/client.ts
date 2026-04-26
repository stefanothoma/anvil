const BASE_URL = "http://localhost:3000/api";

/**
 * Typed fetch wrapper. Throws on non-2xx responses with a meaningful message.
 */
async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((error as { error?: string }).error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

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

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = {
  list: (): Promise<Project[]> =>
    request<Project[]>("/projects"),

  get: (id: string): Promise<Project> =>
    request<Project>(`/projects/${id}`),

  create: (data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Project>): Promise<Project> =>
    request<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = {
  list: (projectId: string): Promise<Document[]> =>
    request<Document[]>(`/documents/${projectId}`),

  get: (projectId: string, type: string): Promise<Document> =>
    request<Document>(`/documents/${projectId}/${type}`),

  upsert: (projectId: string, type: string, content: string): Promise<Document> =>
    request<Document>(`/documents/${projectId}/${type}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
};

// ─── Phases ──────────────────────────────────────────────────────────────────

export const phases = {
  list: (projectId: string): Promise<Phase[]> =>
    request<Phase[]>(`/phases/${projectId}`),

  getActive: (projectId: string): Promise<Phase> =>
    request<Phase>(`/phases/${projectId}/active`),

  create: (
    projectId: string,
    data: Omit<Phase, "id" | "projectId" | "createdAt" | "updatedAt">
  ): Promise<Phase> =>
    request<Phase>(`/phases/${projectId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (projectId: string, id: string, data: Partial<Phase>): Promise<Phase> =>
    request<Phase>(`/phases/${projectId}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Health ──────────────────────────────────────────────────────────────────

export const health = {
  check: (): Promise<{ status: string; timestamp: string }> =>
    request("/health"),
};
