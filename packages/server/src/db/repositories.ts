import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  projects,
  documents,
  phases,
  phaseReports,
  conversations,
  settings,
} from "./schema.js";

export type DB = ReturnType<typeof drizzle>;

// ─── Types ───────────────────────────────────────────────────────────────────

export type NewProject = typeof projects.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewPhase = typeof phases.$inferInsert;
export type Phase = typeof phases.$inferSelect;
export type NewPhaseReport = typeof phaseReports.$inferInsert;
export type PhaseReport = typeof phaseReports.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;

// ─── Projects ────────────────────────────────────────────────────────────────

export function createProject(db: DB, data: NewProject): Project {
  const rows = db.insert(projects).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create project");
  return row;
}

export function getProject(db: DB, id: string): Project | undefined {
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export function listProjects(db: DB): Project[] {
  return db.select().from(projects).all();
}

export function updateProject(
  db: DB,
  id: string,
  data: Partial<Omit<NewProject, "id" | "createdAt">>
): Project {
  const rows = db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()
    .all();
  const row = rows[0];
  if (!row) throw new Error(`Project ${id} not found`);
  return row;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export function upsertDocument(db: DB, data: NewDocument): Document {
  const existing = db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, data.projectId), eq(documents.type, data.type)))
    .get();

  if (existing) {
    const rows = db
      .update(documents)
      .set({ content: data.content, version: existing.version + 1, updatedAt: new Date() })
      .where(eq(documents.id, existing.id))
      .returning()
      .all();
    const row = rows[0];
    if (!row) throw new Error("Failed to update document");
    return row;
  }

  const rows = db.insert(documents).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create document");
  return row;
}

export function getDocument(db: DB, projectId: string, type: string): Document | undefined {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.type, type)))
    .get();
}

export function listDocuments(db: DB, projectId: string): Document[] {
  return db.select().from(documents).where(eq(documents.projectId, projectId)).all();
}

// ─── Phases ──────────────────────────────────────────────────────────────────

export function createPhase(db: DB, data: NewPhase): Phase {
  const rows = db.insert(phases).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create phase");
  return row;
}

export function listPhases(db: DB, projectId: string): Phase[] {
  return db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .all()
    .sort((a, b) => a.order - b.order);
}

export function getActivePhase(db: DB, projectId: string): Phase | undefined {
  return db
    .select()
    .from(phases)
    .where(and(eq(phases.projectId, projectId), eq(phases.status, "active")))
    .get();
}

export function updatePhase(
  db: DB,
  id: string,
  data: Partial<Omit<NewPhase, "id" | "createdAt">>
): Phase {
  const rows = db
    .update(phases)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(phases.id, id))
    .returning()
    .all();
  const row = rows[0];
  if (!row) throw new Error(`Phase ${id} not found`);
  return row;
}

// ─── Phase Reports ───────────────────────────────────────────────────────────

export function createPhaseReport(db: DB, data: NewPhaseReport): PhaseReport {
  const rows = db.insert(phaseReports).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create phase report");
  return row;
}

export function listPhaseReports(db: DB, projectId: string): PhaseReport[] {
  return db
    .select()
    .from(phaseReports)
    .where(eq(phaseReports.projectId, projectId))
    .all();
}

// ─── Conversations ────────────────────────────────────────────────────────────

/**
 * Creates a new conversation session. sessionIndex is auto-incremented
 * based on existing sessions for this (projectId, stage) pair.
 */
export function createConversation(
  db: DB,
  data: Omit<NewConversation, "sessionIndex">
): Conversation {
  const existing = db
    .select({ sessionIndex: conversations.sessionIndex })
    .from(conversations)
    .where(and(eq(conversations.projectId, data.projectId), eq(conversations.stage, data.stage)))
    .all();

  const nextIndex =
    existing.length > 0 ? Math.max(...existing.map((r) => r.sessionIndex)) + 1 : 0;

  const rows = db
    .insert(conversations)
    .values({ ...data, sessionIndex: nextIndex })
    .returning()
    .all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create conversation");
  return row;
}

/** Updates messages and optionally title of an existing session. */
export function updateConversation(
  db: DB,
  id: string,
  data: { messages?: string; title?: string }
): Conversation {
  const rows = db
    .update(conversations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning()
    .all();
  const row = rows[0];
  if (!row) throw new Error(`Conversation ${id} not found`);
  return row;
}

/** Returns a single conversation by ID. */
export function getConversation(db: DB, id: string): Conversation | undefined {
  return db.select().from(conversations).where(eq(conversations.id, id)).get();
}

/**
 * Returns all sessions for a project + stage ordered by sessionIndex ascending.
 * Used by the Context Engine to assemble full thread history.
 */
export function listConversations(db: DB, projectId: string, stage: number): Conversation[] {
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), eq(conversations.stage, stage)))
    .all()
    .sort((a, b) => a.sessionIndex - b.sessionIndex);
}

/** Returns the most recent session for a project + stage. */
export function getLatestConversation(
  db: DB,
  projectId: string,
  stage: number
): Conversation | undefined {
  const all = listConversations(db, projectId, stage);
  return all[all.length - 1];
}

/** Returns all sessions across all stages for a project. */
export function listAllConversations(db: DB, projectId: string): Conversation[] {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .all()
    .sort((a, b) => a.stage - b.stage || a.sessionIndex - b.sessionIndex);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSetting(db: DB, key: string): string | undefined {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value;
}

export function upsertSetting(db: DB, key: string, value: string): void {
  db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
    .run();
}

export interface LLMConfig {
  provider: "anthropic" | "openai" | "custom" | undefined;
  baseUrl: string | undefined;
  apiKey: string | undefined;
  model: string | undefined;
}

export function getLLMConfig(db: DB): LLMConfig {
  return {
    provider: getSetting(db, "llm_provider") as LLMConfig["provider"],
    baseUrl: getSetting(db, "llm_base_url"),
    apiKey: getSetting(db, "llm_api_key"),
    model: getSetting(db, "llm_model"),
  };
}

/**
 * Saves LLM config. If apiKey is empty string, existing key is preserved.
 */
export function setLLMConfig(
  db: DB,
  config: { provider: string; baseUrl: string; apiKey: string; model: string }
): void {
  upsertSetting(db, "llm_provider", config.provider);
  upsertSetting(db, "llm_base_url", config.baseUrl);
  upsertSetting(db, "llm_model", config.model);
  if (config.apiKey.length > 0) {
    upsertSetting(db, "llm_api_key", config.apiKey);
  }
}
