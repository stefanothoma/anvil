import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  upsertDocument,
  getDocument,
  createPhase,
  listPhases,
  getActivePhase,
  updatePhase,
  createConversation,
  updateConversation,
  getConversation,
  listConversations,
  getSetting,
  upsertSetting,
  type DB,
} from "./repositories.js";

// ─── Test DB Setup ───────────────────────────────────────────────────────────

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
    developer_name TEXT NOT NULL, developer_context TEXT NOT NULL DEFAULT '',
    stack TEXT NOT NULL DEFAULT '', stage INTEGER NOT NULL DEFAULT 1,
    repo_url TEXT NOT NULL DEFAULT '', repo_path TEXT NOT NULL DEFAULT '',
    deployment_target TEXT NOT NULL DEFAULT 'not_decided',
    test_command TEXT NOT NULL DEFAULT 'npm test',
    architecture TEXT NOT NULL DEFAULT '', current_state TEXT NOT NULL DEFAULT '',
    environment TEXT NOT NULL DEFAULT '', constraints TEXT NOT NULL DEFAULT '[]',
    code_standards TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
    type TEXT NOT NULL, content TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL, goal TEXT NOT NULL,
    objectives TEXT NOT NULL DEFAULT '[]', gate_criteria TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending', "order" INTEGER NOT NULL,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS phase_reports (
    id TEXT PRIMARY KEY, phase_id TEXT NOT NULL REFERENCES phases(id),
    project_id TEXT NOT NULL REFERENCES projects(id),
    verdict TEXT NOT NULL, report TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    stage INTEGER NOT NULL,
    session_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL DEFAULT '',
    messages TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL
  );
`;

function makeTestDb(): DB {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(SCHEMA_SQL);
  return drizzle(sqlite, { schema });
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const now = new Date();

const testProject = {
  id: "proj-1",
  name: "Test Project",
  description: "A test project",
  developerName: "Stefano",
  createdAt: now,
  updatedAt: now,
};

// ─── Projects ────────────────────────────────────────────────────────────────

describe("projects", () => {
  it("creates and retrieves a project", () => {
    const db = makeTestDb();
    const created = createProject(db, testProject);
    expect(created.id).toBe("proj-1");
    expect(created.name).toBe("Test Project");

    const retrieved = getProject(db, "proj-1");
    expect(retrieved?.name).toBe("Test Project");
  });

  it("returns undefined for missing project", () => {
    const db = makeTestDb();
    expect(getProject(db, "nonexistent")).toBeUndefined();
  });

  it("lists all projects", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    createProject(db, { ...testProject, id: "proj-2", name: "Second" });
    expect(listProjects(db)).toHaveLength(2);
  });

  it("updates a project", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    const updated = updateProject(db, "proj-1", { name: "Updated Name" });
    expect(updated.name).toBe("Updated Name");
  });
});

// ─── Documents ───────────────────────────────────────────────────────────────

describe("documents", () => {
  it("creates a document", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    const doc = upsertDocument(db, {
      id: "doc-1",
      projectId: "proj-1",
      type: "master_doc",
      content: "# Master Doc",
      createdAt: now,
      updatedAt: now,
    });
    expect(doc.type).toBe("master_doc");
    expect(doc.version).toBe(1);
  });

  it("upsert increments version", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    const base = {
      id: "doc-1",
      projectId: "proj-1",
      type: "master_doc",
      content: "v1",
      createdAt: now,
      updatedAt: now,
    };
    upsertDocument(db, base);
    const updated = upsertDocument(db, { ...base, content: "v2" });
    expect(updated.version).toBe(2);
    expect(updated.content).toBe("v2");
  });

  it("retrieves document by type", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    upsertDocument(db, {
      id: "doc-1",
      projectId: "proj-1",
      type: "session_instructions",
      content: "instructions",
      createdAt: now,
      updatedAt: now,
    });
    const doc = getDocument(db, "proj-1", "session_instructions");
    expect(doc?.content).toBe("instructions");
  });
});

// ─── Phases ──────────────────────────────────────────────────────────────────

describe("phases", () => {
  it("creates and lists phases in order", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    createPhase(db, {
      id: "phase-2",
      projectId: "proj-1",
      name: "Phase 2",
      goal: "Second",
      order: 2,
      createdAt: now,
      updatedAt: now,
    });
    createPhase(db, {
      id: "phase-1",
      projectId: "proj-1",
      name: "Phase 1",
      goal: "First",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });
    const list = listPhases(db, "proj-1");
    expect(list[0]?.name).toBe("Phase 1");
    expect(list[1]?.name).toBe("Phase 2");
  });

  it("retrieves active phase", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    createPhase(db, {
      id: "phase-1",
      projectId: "proj-1",
      name: "Phase 1",
      goal: "First",
      order: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    expect(getActivePhase(db, "proj-1")?.status).toBe("active");
  });

  it("updates phase status", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    createPhase(db, {
      id: "phase-1",
      projectId: "proj-1",
      name: "Phase 1",
      goal: "First",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });
    const updated = updatePhase(db, "phase-1", { status: "complete" });
    expect(updated.status).toBe("complete");
  });
});

// ─── Conversations ────────────────────────────────────────────────────────────

describe("conversations", () => {
  it("creates a conversation with sessionIndex 0", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    const conv = createConversation(db, {
      id: "conv-1",
      projectId: "proj-1",
      stage: 1,
      messages: "[]",
      createdAt: now,
      updatedAt: now,
    });
    expect(conv.sessionIndex).toBe(0);
    expect(conv.stage).toBe(1);
  });

  it("auto-increments sessionIndex for subsequent sessions", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    createConversation(db, {
      id: "conv-1",
      projectId: "proj-1",
      stage: 1,
      messages: "[]",
      createdAt: now,
      updatedAt: now,
    });
    const conv2 = createConversation(db, {
      id: "conv-2",
      projectId: "proj-1",
      stage: 1,
      messages: "[]",
      createdAt: now,
      updatedAt: now,
    });
    expect(conv2.sessionIndex).toBe(1);
  });

  it("updates conversation messages", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    const conv = createConversation(db, {
      id: "conv-1",
      projectId: "proj-1",
      stage: 1,
      messages: "[]",
      createdAt: now,
      updatedAt: now,
    });
    updateConversation(db, conv.id, {
      messages: '[{"role":"user","content":"hi"}]',
    });
    const updated = getConversation(db, conv.id);
    expect(updated?.messages).toContain("hi");
  });

  it("lists conversations ordered by sessionIndex", () => {
    const db = makeTestDb();
    createProject(db, testProject);
    createConversation(db, { id: "conv-1", projectId: "proj-1", stage: 1, messages: "[]", createdAt: now, updatedAt: now });
    createConversation(db, { id: "conv-2", projectId: "proj-1", stage: 1, messages: "[]", createdAt: now, updatedAt: now });
    const list = listConversations(db, "proj-1", 1);
    expect(list).toHaveLength(2);
    expect(list[0]!.sessionIndex).toBe(0);
    expect(list[1]!.sessionIndex).toBe(1);
  });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

describe("settings", () => {
  it("sets and gets a setting", () => {
    const db = makeTestDb();
    upsertSetting(db, "llm_provider", "anthropic");
    expect(getSetting(db, "llm_provider")).toBe("anthropic");
  });

  it("returns undefined for missing setting", () => {
    const db = makeTestDb();
    expect(getSetting(db, "nonexistent")).toBeUndefined();
  });

  it("overwrites an existing setting", () => {
    const db = makeTestDb();
    upsertSetting(db, "llm_provider", "anthropic");
    upsertSetting(db, "llm_provider", "openai");
    expect(getSetting(db, "llm_provider")).toBe("openai");
  });
});
